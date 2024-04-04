import { Observable, catchError, concatMap, forkJoin, from, map, of, switchMap } from 'rxjs';

import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import { OAuthBaseConnector } from './oauth.base';

export const GDriveConnector: SourceConnectorDefinition = {
  id: 'gdrive',
  factory: () => new GDriveImpl(),
};

export class GDriveImpl extends OAuthBaseConnector implements IConnector {
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
      return forkJoin((folders || []).map((folder) => this._getFileItems('', folder.uuid))).pipe(
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
        error: `Error fetching last modified files: ${err}`,
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
      return forkJoin((folders || []).map((folder) => this._getFileItems('', folder.uuid))).pipe(
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
        error: `Error fetching files: ${err}`,
      });
    }
  }

  getFolders(query?: string | undefined): Observable<SearchResults> {
    return this._getItems(query, '', true).pipe(
      map((results) => {
        const folders = results.items;
        const getFolder = (folderId: string) => {
          return folders.find((folder) => folder.originalId === folderId);
        };
        const parents = folders.reduce(
          (acc, folder) => {
            if (folder.parents) {
              acc[folder.originalId] = folder.parents[0];
            }
            return acc;
          },
          {} as { [key: string]: string },
        );
        const getFolderPath = (folderId: string | undefined) => {
          if (!folderId) {
            return [];
          }
          let path: string[] = [];
          let currentFolder = getFolder(folderId);
          while (currentFolder) {
            path = [currentFolder.title, ...path];
            if (!parents[currentFolder.originalId]) {
              break;
            }
            currentFolder = getFolder(parents[currentFolder.originalId]);
          }
          return path;
        };
        const foldersWithPath = folders.map((folder) => ({
          ...folder,
          metadata: {
            ...folder.metadata,
            path: getFolderPath(folder.parents?.[0]).join('/'),
          },
        }));
        return {
          ...results,
          items: foldersWithPath,
        };
      }),
    );
  }

  isAccessTokenValid(): Observable<boolean> {
    return from(
      fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          Authorization: `Bearer ${this.params.token || ''}`,
        },
      }).then(
        (res) => res.json(),
        (err) => {
          console.error(`Error fetching about: ${err}`);
          throw new Error(err);
        },
      ),
    ).pipe(
      concatMap((res) => {
        if (res.error && res.error.status === 'UNAUTHENTICATED') {
          return of(false);
        }
        return of(true);
      }),
      catchError(() => {
        return of(true);
      }),
    );
  }

  private getSubFolders(folders: SearchResults, folderId: string): string[] {
    const getChildren = (folderId: string) => {
      return folders.items.filter((item) => item.parents?.includes(folderId)).map((item) => item.originalId);
    };
    const children = getChildren(folderId);
    return children.reduce((acc, child) => [...acc, ...getChildren(child)], children);
  }

  private _getFileItems(query = '', folder = ''): Observable<SearchResults> {
    return this.getFolders().pipe(
      switchMap((folders) => {
        if (folder) {
          const allTargetedFolders = [folder, ...this.getSubFolders(folders, folder)];
          return forkJoin(allTargetedFolders.map((folder) => this._getItems(query, folder, false))).pipe(
            map((results) => {
              const items = results.reduce((acc, result) => acc.concat(result.items), [] as SyncItem[]);
              return {
                files: {
                  items,
                },
                folders,
              };
            }),
          );
        } else {
          return this._getItems(query, '', false).pipe(map((results) => ({ files: results, folders })));
        }
      }),
      map(({ files, folders }) => {
        const getFolder = (folderId: string) => {
          return folders.items.find((folder) => folder.originalId === folderId);
        };
        const parents = folders.items.reduce(
          (acc, folder) => {
            if (folder.parents) {
              acc[folder.originalId] = folder.parents[0];
            }
            return acc;
          },
          {} as { [key: string]: string },
        );
        const getFolderPath = (folderId: string | undefined) => {
          if (!folderId) {
            return [];
          }
          let path: string[] = [];
          let currentFolder = getFolder(folderId);
          while (currentFolder) {
            path = [currentFolder.title, ...path];
            if (!parents[currentFolder.originalId]) {
              break;
            }
            currentFolder = getFolder(parents[currentFolder.originalId]);
          }
          return path;
        };
        const itemsWithPath = files.items.map((item) => ({
          ...item,
          metadata: {
            ...item.metadata,
            path: getFolderPath(item.parents?.[0]).join('/'),
          },
        }));
        return {
          ...files,
          items: itemsWithPath,
        };
      }),
    );
  }

  // Script create the tree https://gist.github.com/tanaikech/97b336f04c739ae0181a606eab3dff42
  private _getItems(
    query = '',
    folder = '',
    foldersOnly = false,
    nextPage?: string,
    previous?: SearchResults,
  ): Observable<SearchResults> {
    let path =
      'https://www.googleapis.com/drive/v3/files?pageSize=50&fields=nextPageToken,files(id,name,mimeType,modifiedTime,parents)';
    const allDrives = '&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true';
    path += allDrives;
    if (query) {
      path += `&q=name contains '${query}' and ${
        foldersOnly ? '' : 'not '
      }mimeType = 'application/vnd.google-apps.folder'`;
    } else {
      path += `&q=${foldersOnly ? '' : 'not '}mimeType = 'application/vnd.google-apps.folder'`;
    }
    path += folder ? ` and '${folder}' in parents` : '';
    if (nextPage) {
      path += `&pageToken=${nextPage}`;
    }
    return from(
      fetch(path, {
        headers: {
          Authorization: `Bearer ${this.params.token || ''}`,
        },
      }).then(
        (res) => res.json(),
        (err) => {
          console.error(`Error fetching ${path}: ${err}`);
        },
      ),
    ).pipe(
      concatMap((res) => {
        if (res.error) {
          if (res.error.status === 'UNAUTHENTICATED') {
            throw new Error('Unauthorized');
          } else {
            throw new Error(res.error.message || 'Unknown error');
          }
        } else {
          const nextPage = res['nextPageToken'];
          const items = (res.files || []).map((item: unknown) => this.mapToSyncItem(item));
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
    const needsPdfConversion = item.mimeType.startsWith('application/vnd.google-apps');
    return {
      uuid: item.id,
      title: item.name,
      originalId: item.id,
      modifiedGMT: item.modifiedTime,
      parents: item.parents,
      mimeType: needsPdfConversion ? 'application/pdf' : item.mimeType,
      metadata: {
        needsPdfConversion: needsPdfConversion ? 'yes' : 'no',
      },
      status: FileStatus.PENDING,
    };
  }

  getLink(): Observable<Link> {
    throw new Error('Method not implemented.');
  }

  download(resource: SyncItem): Observable<Blob> {
    return new Observable<Blob>((observer) => {
      const request =
        resource.metadata.needsPdfConversion === 'yes'
          ? `https://www.googleapis.com/drive/v3/files/${resource.originalId}/export?mimeType=application/pdf&supportsAllDrives=true`
          : `https://www.googleapis.com/drive/v3/files/${resource.originalId}?alt=media&supportsAllDrives=true`;

      fetch(request, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.params.token}` },
      })
        .then((response) => response.blob())
        .then((blob) => {
          observer.next(blob);
          observer.complete();
        });
    });
  }
}
