import { Blob as FSBlob } from 'buffer';
import * as fs from 'fs';
import path from 'path';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';

const FILES_TO_IGNORE = ['.DS_Store', 'Thumbs.db'];

export const FolderConnector: SourceConnectorDefinition = {
  id: 'folder',
  factory: () => new FolderImpl(),
};

class FolderImpl implements IConnector {
  isExternal = false;
  params: ConnectorParameters = {};

  hasAuthData(): boolean {
    return true;
  }

  setParameters(params: ConnectorParameters) {
    this.params = params;
  }

  areParametersValid(params: ConnectorParameters) {
    if (!params?.path) {
      return false;
    }
    return true;
  }

  getParameters(): ConnectorParameters {
    return this.params;
  }

  getFolders(): Observable<SearchResults> {
    throw new Error('Method not supported by Folder connector.');
  }

  getFiles(query?: string): Observable<SearchResults> {
    return this._getFiles(this.params.path, query);
  }

  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
    try {
      return forkJoin((folders || []).map((folder) => this._getFiles(folder.originalId))).pipe(
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

  getLastModified(since: string, folders?: SyncItem[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }

    try {
      return forkJoin(
        (folders || []).map((folder) =>
          this._getFiles(folder.originalId).pipe(
            switchMap((results) => this.getFilesModifiedSince(results.items, since)),
          ),
        ),
      ).pipe(
        map((results) => {
          const items = results.reduce((acc, result) => acc.concat(result), [] as SyncItem[]);
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

  private _getFiles(path: string, query?: string): Observable<SearchResults> {
    return of({
      items: this.mapFSFiles(this.listAllFiles(path)).filter((item) =>
        query ? item.title.toLocaleLowerCase().includes(query?.toLocaleLowerCase()) : true,
      ),
    });
  }

  private listAllFiles(folderPath: string): string[] {
    let files: string[] = [];
    const contents = fs
      .readdirSync(folderPath)
      .filter((file) => !FILES_TO_IGNORE.includes(file))
      .map((file) => path.join(folderPath, file));
    contents.forEach((contentPath) => {
      if (fs.statSync(contentPath).isDirectory()) {
        files = [...files, ...this.listAllFiles(contentPath)];
      } else {
        files.push(contentPath);
      }
    });
    return files;
  }

  private getFilesModifiedSince(items: SyncItem[], since: string): Promise<SyncItem[]> {
    return Promise.all(
      items.map((item) => {
        return new Promise<SyncItem | undefined>((resolve, reject) => {
          fs.stat(item.originalId, (err, stats) => {
            if (err) {
              reject(err);
            } else {
              if (stats.ctime > new Date(since)) {
                resolve(item);
              } else {
                resolve(undefined);
              }
            }
          });
        });
      }),
    ).then((results) => results.filter((result) => !!result).map((result) => result as SyncItem));
  }

  private mapFSFiles(files: string[]): SyncItem[] {
    return files.map((file) => ({
      title: file.split('/').pop() || '',
      originalId: file,
      metadata: {},
      status: FileStatus.PENDING,
      uid: '',
    }));
  }

  download(resource: SyncItem): Observable<Blob | undefined> {
    try {
      const buffer = fs.readFileSync(resource.originalId);
      const blob = new FSBlob([buffer], { type: 'application/octet-stream' });
      return of(blob as Blob);
    } catch (e) {
      console.error(e);
      return of(undefined);
    }
  }

  getLink(): Observable<Link> {
    throw new Error('Method not supported by Folder connector.');
  }

  refreshAuthentication(): Observable<boolean> {
    return of(true);
  }
  isAccessTokenValid(): Observable<boolean> {
    return of(true);
  }
}
