import { catchError, forkJoin, from, map, Observable, of, switchMap, tap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';

interface SitefinityBase {
  Id: string;
  LastModified: string;
}

interface SitefinityPage extends SitefinityBase {
  Title: string;
  ViewUrl: string;
}

interface SitefinityContent extends SitefinityBase {
  Title: string;
  ViewUrl: string;
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

  private getExtraContentTypes(): string[] {
    return ((this.params['extraContentTypes'] as string) || '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => !!v);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _getFiles(): Observable<SearchResults> {
    const siteUrl = this.params['url'];
    return forkJoin([
      this.params.extraContentTypesOnly ? of([]) : this._getContents<SitefinityPage>('pages'),
      this.params.extraContentTypesOnly ? of([]) : this._getMediaAndDocs(),
      ...this.getExtraContentTypes().map((ct) => this._getContents<SitefinityPage>(ct)),
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
                isExternal: !!this.getParameters().webScraping,
                metadata: {
                  type: 'PAGE',
                  uri: siteUrl + content.ViewUrl,
                  path: content.ViewUrl,
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
                  return this._getContents<SitefinityContent>(typeId, provider).pipe(
                    map((subContents) =>
                      subContents.map((subContent) => {
                        [
                          'Id',
                          'LastModified',
                          'Title',
                          'ViewUrl',
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

  getLink(resource: SyncItem): Observable<Link> {
    return of({
      uri: resource.metadata['uri'],
      extra_headers: {},
      cssSelector: this.getParameters().webScrapingCssSelector,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    return this._getFiles();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastModified(since: string, folders?: SyncItem[], existings?: string[]): Observable<SearchResults> {
    return this._getFiles().pipe(
      map((res) => {
        const existingOnSitefinity = res.items.map((r) => r.originalId);
        const deleted = (existings || []).filter((id) => !existingOnSitefinity.includes(id));
        const items = res.items.filter((r) => r.metadata.lastModified >= since);
        return {
          ...res,
          items: [
            ...deleted.map((id) => ({ uuid: id, originalId: id, title: '', metadata: {}, deleted: true })),
            ...items,
          ],
        };
      }),
    );
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }

  private _getMediaAndDocs(): Observable<SitefinityFile[]> {
    return forkJoin([
      this._getContents<SitefinityFile>('documents'),
      this._getContents<SitefinityFile>('images'),
      this._getContents<SitefinityFile>('videos'),
    ]).pipe(map(([documents, images, videos]) => documents.concat(images).concat(videos)));
  }

  private _getContents<T>(
    type: string,
    provider?: string,
    nextUrl?: string,
    values?: T[],
    select?: string,
  ): Observable<T[]> {
    let endpoint = `${this.params['url']}/api/default/${type}?sf_site=${this.params['siteId']}`;
    if (provider) {
      endpoint += `&$sf_provider=${provider}`;
    }
    if (select) {
      endpoint += `&$select=${select}`;
    }
    return from(
      fetch(nextUrl || endpoint, {
        headers: {
          'X-SF-Access-Key': this.params['apikey'],
        },
      }).then((res) => res.json()),
    ).pipe(
      switchMap((contents) => {
        const allvalues = (values || []).concat(contents.value);
        if (contents['@odata.nextLink']) {
          return this._getContents(type, provider, contents['@odata.nextLink'], allvalues, select);
        } else {
          return of(allvalues);
        }
      }),
    );
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
