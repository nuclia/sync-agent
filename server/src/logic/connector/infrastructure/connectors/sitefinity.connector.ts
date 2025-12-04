import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';

interface SitefinityPage {
  Id: string;
  LastModified: string;
  Title: string;
  RelativeUrlPath: string;
}

interface SitefinityContent {
  Id: string;
  LastModified: string;
  Title: string;
  RelativeUrlPath: string;
  PublicationDate: string;
  DateCreated: string;
  IncludeInSitemap: boolean;
  SystemSourceKey: null;
  UrlName: string;
  ItemDefaultUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface SitefinityFile {
  Id: string;
  LastModified: string;
  Title: string;
  Url: string;
  MimeType: string;
}

interface SitefinityComponent {
  Properties?: {
    Content?: string;
  };
  Name: string;
  Children: SitefinityComponent[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContent(component: SitefinityComponent): any[] {
  const childrenContents: string[] = (component.Children || []).reduce((all, curr) => {
    return [...all, ...getContent(curr)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, [] as any[]);
  return [{ ...component.Properties, Name: component.Name || '' }, ...childrenContents];
}

export const SitefinityConnector: SourceConnectorDefinition = {
  id: 'sitefinity',
  factory: () => new SitefinityImpl(),
};

class SitefinityImpl implements IConnector {
  isExternal = false;
  params: ConnectorParameters = {};
  private _types: { [key: string]: string } | undefined = undefined;

  hasAuthData(): boolean {
    return !!this.params?.apikey;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters): boolean {
    return !!params?.url && !!params?.apikey && !!params?.siteId;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  getFolders(): Observable<SearchResults> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _getFiles(lastModified?: string): Observable<SearchResults> {
    const siteUrl = this.params['url'];
    const extraContentTypes = ((this.params['extraContentTypes'] as string) || '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => !!v);
    return forkJoin([
      this.params.extraContentTypesOnly ? of([]) : this._getContents<SitefinityPage>('pages', lastModified),
      this.params.extraContentTypesOnly ? of([]) : this._getMediaAndDocs(lastModified),
      ...extraContentTypes.map((ct) => this._getContents<SitefinityPage>(ct, lastModified)),
    ]).pipe(
      map(([pages, files, ...extra]) => {
        const extraContents: SyncItem[] = extra.reduce((all, curr) => {
          all = all.concat(
            curr.map((content) => ({
              title: content.Title,
              status: FileStatus.PENDING,
              uuid: content.Id,
              originalId: content.Id,
              mimeType: 'application/json',
              metadata: {
                type: 'CONTENT',
                data: JSON.stringify(content),
                lastModified: content.LastModified,
              },
            })),
          );
          return all;
        }, [] as SyncItem[]);
        return {
          items: pages
            .map((content) => {
              return {
                title: content.Title,
                status: FileStatus.PENDING,
                uuid: content.Id,
                originalId: content.Id,
                mimeType: 'text/html',
                metadata: {
                  type: 'PAGE',
                  uri: siteUrl + content.RelativeUrlPath,
                  path: content.RelativeUrlPath,
                  lastModified: content.LastModified,
                },
              } as SyncItem;
            })
            .concat(
              files.map((file) => {
                return {
                  title: file.Title,
                  status: FileStatus.PENDING,
                  uuid: file.Id,
                  originalId: file.Id,
                  mimeType: file.MimeType,
                  metadata: {
                    type: 'FILE',
                    uri: siteUrl + file.Url,
                    path: file.Url,
                    lastModified: file.LastModified,
                  },
                } as SyncItem;
              }),
            )
            .concat(extraContents),
        };
      }),
      catchError((err) => of({ items: [], error: `${err}` })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  download(
    resource: SyncItem,
  ): Observable<{ body: string; format?: 'PLAIN' | 'MARKDOWN' | 'HTML' | 'JSON' } | Blob | undefined> {
    if (resource.metadata.type === 'PAGE') {
      return this.downloadPage(resource);
    } else if (resource.metadata.type === 'CONTENT') {
      return of({ body: resource.metadata.data, format: 'JSON' });
    } else {
      return this.downloadFile(resource);
    }
  }

  private downloadFile(resource: SyncItem): Observable<Blob | undefined> {
    return from(
      fetch(resource.metadata.uri, {
        headers: {
          'X-SF-Access-Key': this.params['apikey'],
        },
      }).then((res) => res.blob()),
    );
  }

  private downloadPage(
    resource: SyncItem,
  ): Observable<{ body: string; format?: 'PLAIN' | 'MARKDOWN' | 'HTML' } | undefined> {
    const pageEndpoint = `${this.params['url']}/api/default/pages/Default.Model(url=@param)?sf_site=${
      this.params['siteId']
    }&@param='${encodeURIComponent(resource.metadata.path)}'`;
    return from(
      fetch(pageEndpoint, {
        headers: {
          'X-SF-Access-Key': this.params['apikey'],
        },
      })
        .then((res) => res.json())
        .catch(() => {
          console.error(`Could not parse ${pageEndpoint} content.`);
          return undefined;
        }),
    ).pipe(
      switchMap((page) => {
        const contents = ((page?.ComponentContext?.Components as SitefinityComponent[]) || []).reduce((all, comp) => {
          return [...all, ...getContent(comp)];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, [] as any[]);
        return forkJoin(
          contents.map((prop) => {
            if (prop.Content) {
              return of(prop.Content as string);
            } else if (prop.Name === 'SitefinityContentList') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let selectedItems: any;
              try {
                selectedItems = JSON.parse(prop.SelectedItems || '{}');
              } catch {
                return of('');
              }
              const collection = selectedItems.Content[0];
              if (!collection) {
                return of('');
              }
              const entity = collection.Type;
              const provider = collection.Variations && collection.Variations[0].Source;
              if (!entity || !provider) {
                return of('');
              }
              return this.getType(entity).pipe(
                switchMap((typeId) => {
                  if (!typeId) {
                    return of('');
                  }
                  return this._getContents<SitefinityContent>(typeId, undefined, provider).pipe(
                    map((subContents) =>
                      subContents.map((subContent) => {
                        [
                          'Id',
                          'LastModified',
                          'Title',
                          'RelativeUrlPath',
                          'PublicationDate',
                          'DateCreated',
                          'IncludeInSitemap',
                          'SystemSourceKey',
                          'UrlName',
                          'ItemDefaultUrl',
                        ].forEach((k: string) => delete subContent[k]);
                        return JSON.stringify(subContent);
                      }),
                    ),
                  );
                }),
              );
            } else {
              return of('');
            }
          }),
        );
      }),
      map((contents) => {
        return {
          body: contents.join('\n\n'),
          format: 'HTML',
        };
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLink(resource: SyncItem): Observable<Link> {
    throw new Error('Method "getLink" not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    return this._getFiles();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastModified(since: string, folders?: SyncItem[], existings?: string[]): Observable<SearchResults> {
    return this._getFiles(since);
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }

  private _getMediaAndDocs(lastModified?: string): Observable<SitefinityFile[]> {
    return forkJoin([
      this._getContents<SitefinityFile>('documents', lastModified),
      this._getContents<SitefinityFile>('images', lastModified),
      this._getContents<SitefinityFile>('videos', lastModified),
    ]).pipe(map(([documents, images, videos]) => documents.concat(images).concat(videos)));
  }

  private _getContents<T>(type: string, lastModified?: string, provider?: string): Observable<T[]> {
    let endpoint = `${this.params['url']}/api/default/${type}?sf_site=${this.params['siteId']}`;
    if (lastModified) {
      endpoint += `&$filter=LastModified gt ${lastModified}`;
    }
    if (provider) {
      endpoint += `&$sf_provider=${provider}`;
    }
    return from(
      fetch(endpoint, {
        headers: {
          'X-SF-Access-Key': this.params['apikey'],
        },
      }).then((res) => res.json()),
    ).pipe(map((contents) => contents.value));
  }

  private getType(entity: string): Observable<string> {
    return this._getTypes().pipe(map((types) => types[entity] || ''));
  }

  private _getTypes(): Observable<{ [key: string]: string }> {
    if (this._types) {
      return of(this._types);
    } else {
      const endpoint = `${this.params['url']}/api/default/sfmeta?sf_site=${this.params['siteId']}`;
      return from(
        fetch(endpoint, {
          headers: {
            'X-SF-Access-Key': this.params['apikey'],
          },
        }).then((res) => res.json()),
      ).pipe(
        map((data) => {
          const mapping = Object.entries(data?.entityContainer?.entitySets || {}).reduce(
            (all, [key, value]) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const entityType = ((value as any)?.entityType?.$ref || '').replace('#/definitions/', '') as string;
              all[entityType] = key;
              return all;
            },
            {} as { [key: string]: string },
          );
          this._types = mapping;
          return this._types;
        }),
      );
    }
  }
}
