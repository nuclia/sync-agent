import { concatMap, forkJoin, from, map, Observable, of } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';

const BATCH_SIZE = 50;

export const ConfluenceConnector: SourceConnectorDefinition = {
  id: 'confluence',
  factory: () => new ConfluenceImpl(),
};

export class ConfluenceImpl implements IConnector {
  isExternal = false;
  params: ConnectorParameters = {};

  hasAuthData(): boolean {
    return !!this.params?.user && !!this.params?.token;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters) {
    if (!params?.url || !params?.user || !params?.token) {
      return false;
    }
    try {
      new URL(params.url);
    } catch (err) {
      return false;
    }
    return true;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  getFolders(): Observable<SearchResults> {
    return this._getFiles('', true);
  }

  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
    return forkJoin((folders || []).map((folder) => this._getFiles('', false, folder.originalId))).pipe(
      map((results) => {
        const result: { items: SyncItem[] } = {
          items: [],
        };
        results.forEach((res) => {
          result.items = [...result.items, ...res.items];
        });
        return result;
      }),
    );
  }

  getLastModified(since: string, folders?: SyncItem[]): Observable<SearchResults> {
    if (!folders || folders.length === 0) {
      return of({
        items: [],
      });
    } else {
      return forkJoin((folders || []).map((folder) => this._getFiles('', false, folder.originalId, since))).pipe(
        map((results) => ({ items: results.reduce((acc, result) => acc.concat(result.items), [] as SyncItem[]) })),
      );
    }
  }

  private _getFiles(
    query?: string,
    loadFolders = false,
    folder = '',
    lastModified?: string,
    start?: number,
    previous?: SearchResults,
  ): Observable<SearchResults> {
    const success = (url: string) => {
      return (res: Response) => {
        if (res.status === 200) {
          return res.json();
        } else if (res.status === 401) {
          console.error(`Unauthorized for ${url}`);
          throw new Error('Unauthorized');
        } else {
          console.error(`Error for ${url}`);
          return res.text().then((text: string) => {
            throw new Error(text || 'Unknown error');
          });
        }
      };
    };
    const failure = (url: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (err: any) => {
        console.error(`Error for ${url}: ${err}`);
        throw new Error();
      };
    };
    let endpoint = this.params.url;
    if (loadFolders) {
      endpoint += '/rest/api/space?';
    } else {
      if (folder && folder !== '/') {
        endpoint += `/rest/api/content/search?cql=space="${folder}" and lastModified > "${
          lastModified ? lastModified.slice(0, 16).replace('T', ' ') : '1970-01-01'
        }"`;
      } else if (query) {
        endpoint += `/rest/api/content/search?cql=text~"${query}"`;
      } else {
        endpoint += '/rest/api/content?';
      }
    }
    return from(
      fetch(`${endpoint}&limit=${BATCH_SIZE}&start=${start || 0}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${btoa(this.params.user + ':' + this.params.token)}`,
          'Content-Type': 'application/json',
        },
      }).then(success(endpoint), failure(endpoint)),
    ).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      concatMap((result: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newItems = result.results?.map((r: any) => this.mapResults(r, loadFolders));
        const items = [...(previous?.items || []), ...newItems];
        const next = (start || 0) + BATCH_SIZE;
        return result._links.next
          ? this._getFiles(query, loadFolders, folder, lastModified, next, { items })
          : of({ items });
      }),
    );
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  private mapResults(raw: any, isFolder = false): SyncItem {
    const isAttachment = raw.type === 'attachment';
    const itemOriginalId = isAttachment ? raw._links?.webui?.split('pageId=')[1]?.split('&')[0] || '' : raw.id;
    return {
      title: (isFolder ? raw.name : raw.title) || '',
      originalId: (isFolder ? raw.key : itemOriginalId) || '',
      metadata: { type: raw.type || '', path: raw._links?.webui || '' },
      status: FileStatus.PENDING,
      uuid: `${raw.id}` || '',
      isFolder: false,
    };
  }

  download(
    resource: SyncItem,
  ): Observable<{ body: string; format?: 'PLAIN' | 'MARKDOWN' | 'HTML' } | Blob | undefined> {
    try {
      if (resource.metadata.type === 'attachment') {
        return from(
          fetch(`${this.params.url}/download/attachments/${resource.originalId}/${resource.title}`, {
            method: 'GET',
            headers: {
              Authorization: `Basic ${btoa(this.params.user + ':' + this.params.token)}`,
            },
          }).then((res) => res.blob()),
        );
      } else {
        return from(
          fetch(`${this.params.url}/rest/api/content/${resource.originalId}?expand=body.storage`, {
            method: 'GET',
            headers: {
              Authorization: `Basic ${btoa(this.params.user + ':' + this.params.token)}`,
              'Content-Type': 'application/json',
            },
          }).then((res) => res.json()),
        ).pipe(
          map((res) => ({
            body: res.body.storage.value,
            format: 'HTML',
          })),
        );
      }
    } catch (e) {
      console.error(e);
      return of(undefined);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLink(resource: SyncItem): Observable<Link> {
    throw new Error('Method not implemented.');
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }
}
