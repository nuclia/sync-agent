import { Observable, catchError, concatMap, forkJoin, from, map, of } from 'rxjs';

import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import { OAuthBaseConnector } from './oauth.base';

export const OneDriveConnector: SourceConnectorDefinition = {
  id: 'onedrive',
  factory: () => new OneDriveImpl(),
};

export class OneDriveImpl extends OAuthBaseConnector implements IConnector {
  params: ConnectorParameters = {};
  isExternal = false;

  hasAuthData() {
    return !!this.params.token;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  areParametersValid(params: ConnectorParameters) {
    if (!params?.token) {
      return false;
    }
    if (!params?.refresh) {
      return false;
    }
    try {
      new URL(params.refresh_endpoint);
    } catch (err) {
      return false;
    }
    return true;
  }

  getLastModified(since: string, folders?: SyncItem[] | undefined): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
    try {
      return forkJoin((folders || []).map((folder) => this._getItems('', folder.uuid))).pipe(
        map((results) => {
          const items = results.reduce(
            (acc, result) => acc.concat(result.items.filter((item) => item.modifiedGMT && item.modifiedGMT > since)),
            [] as SyncItem[],
          );
          return {
            items,
          };
        }),
      );
    } catch (err) {
      return of({
        items: [],
      });
    }
  }

  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
    try {
      return forkJoin((folders || []).map((folder) => this._getItems('', folder.uuid))).pipe(
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
    } catch (err) {
      return of({
        items: [],
      });
    }
  }

  getFolders(query?: string | undefined): Observable<SearchResults> {
    return this._getItems(query, '', true);
  }

  getFiles(query?: string): Observable<SearchResults> {
    return this._getItems(query);
  }

  isAccesTokenValid(): Observable<boolean> {
    return from(
      fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: {
          Authorization: `Bearer ${this.params.token || ''}`,
        },
      }).then(
        (res) => res.json(),
        (err) => {
          console.error(`Error fetching about: ${JSON.stringify(err)}`);
          throw new Error(err);
        },
      ),
    ).pipe(
      concatMap((res) => {
        if (res.error && res.error.code === 'InvalidAuthenticationToken') {
          return of(false);
        }
        return of(true);
      }),
      catchError(() => {
        return of(true);
      }),
    );
  }

  private _getItems(
    query = '',
    folder = '',
    foldersOnly = false,
    nextPage?: string,
    previous?: SearchResults,
  ): Observable<SearchResults> {
    let path = `https://graph.microsoft.com/v1.0/me/drive/${folder ? `items/${folder}` : 'root'}`;
    if (query) {
      path += `/search(q='${query}')`;
    } else {
      path += '/children';
    }
    path += `?top=100${foldersOnly ? '&filter=folder ne null' : ''}`;
    if (nextPage) {
      path += `&$skiptoken=${nextPage}`;
    }

    return from(
      fetch(path, {
        headers: {
          Authorization: `Bearer ${this.params.token || ''}`,
        },
      }).then(
        (res) => res.json(),
        (err) => {
          console.error(`Error fetching ${path}: ${JSON.stringify(err)}`);
        },
      ),
    ).pipe(
      concatMap((res) => {
        if (res.error) {
          console.error(`Error fetching ${path}: ${JSON.stringify(res.error)}`);
          if (res.error.code === 'InvalidAuthenticationToken') {
            throw new Error('Unauthorized');
          } else {
            throw new Error(res.error.message || 'Unknown error');
          }
        } else {
          const nextPage =
            res['@odata.nextLink'] && res['@odata.nextLink'].includes('&$skiptoken=')
              ? res?.['@odata.nextLink'].split('&$skiptoken=')[1].split('&')[0]
              : undefined;
          const items = (res.value || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => foldersOnly || !!item.file)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => (foldersOnly ? this.mapToSyncItemFolder(item) : this.mapToSyncItem(item)));
          const results = {
            items: [...(previous?.items || []), ...items],
            nextPage,
          };
          return nextPage ? this._getItems(query, folder, foldersOnly, nextPage, results) : of(results);
        }
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToSyncItem(item: any): SyncItem {
    return {
      uuid: item.id,
      title: item.name,
      originalId: item.id,
      modifiedGMT: item.lastModifiedDateTime,
      metadata: { mimeType: item.file.mimeType, downloadLink: item['@microsoft.graph.downloadUrl'] },
      status: FileStatus.PENDING,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToSyncItemFolder(item: any): SyncItem {
    return {
      uuid: item.id,
      title: item.name,
      originalId: item.id,
      metadata: {},
      status: FileStatus.PENDING,
      isFolder: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLink(resource: SyncItem): Observable<Link> {
    throw new Error('Method not implemented.');
  }

  download(resource: SyncItem): Observable<Blob> {
    return from(
      fetch(resource.metadata.downloadLink, { headers: { Authorization: `Bearer ${this.params.token || ''}` } }).then(
        (res) => res.blob(),
      ),
    );
  }
}