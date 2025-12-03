import { catchError, forkJoin, from, map, Observable, of } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';

interface SitefinityPage {
  Id: string;
  LastModified: string;
  Title: string;
  RelativeUrlPath: string;
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
  Children: SitefinityComponent[];
}

function getContent(component: SitefinityComponent): string[] {
  const childrenContents: string[] = (component.Children || []).reduce((all, curr) => {
    return [...all, ...getContent(curr)];
  }, [] as string[]);
  return [component.Properties?.Content || '', ...childrenContents];
}

export const SitefinityConnector: SourceConnectorDefinition = {
  id: 'sitefinity',
  factory: () => new SitefinityImpl(),
};

class SitefinityImpl implements IConnector {
  isExternal = false;
  params: ConnectorParameters = {};

  hasAuthData(): boolean {
    return !!this.params?.apikey;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters): boolean {
    return !!params?.url && !!params?.apikey;
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
      this._getContents<SitefinityPage>('pages', lastModified),
      this._getMediaAndDocs(lastModified),
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
      map((page) => {
        const contents = ((page?.ComponentContext?.Components as SitefinityComponent[]) || []).reduce((all, comp) => {
          return [...all, ...getContent(comp)];
        }, [] as string[]);
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

  private _getContents<T>(type: string, lastModified?: string): Observable<T[]> {
    let endpoint = `${this.params['url']}/api/default/${type}?sf_site=${this.params['siteId']}`;
    if (lastModified) {
      endpoint += `&$filter=LastModified gt ${lastModified}`;
    }
    return from(
      fetch(endpoint, {
        headers: {
          'X-SF-Access-Key': this.params['apikey'],
        },
      }).then((res) => res.json()),
    ).pipe(map((contents) => contents.value));
  }
}
