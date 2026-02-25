import { Blob as FSBlob } from 'buffer';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import { forkJoin, from, map, Observable, of, switchMap, tap } from 'rxjs';
import { ConnectorParameters, FileStatus, IConnector, Link, SearchResults, SyncItem } from '../../domain/connector';
import { SourceConnectorDefinition } from '../factory';
import { lookup } from 'mime-types';

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

  getFilesFromFolders(folders: SyncItem[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
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
  }

  getLastModified(since: string, folders?: SyncItem[], existings?: string[]): Observable<SearchResults> {
    if ((folders ?? []).length === 0) {
      return of({
        items: [],
      });
    }
    let currentIds: string[] = [];

    return forkJoin(
      (folders || []).map((folder) =>
        this._getFiles(folder.originalId).pipe(
          tap((result) => (currentIds = [...currentIds, ...result.items.map((item) => item.originalId)])),
          switchMap((results) =>
            from(this.getFilesModifiedSince(results.items, since)).pipe(
              map((items) => ({ items, error: results.error })),
            ),
          ),
        ),
      ),
    ).pipe(
      map((results) => {
        const items = results.reduce((acc, result) => acc.concat(result.items), [] as SyncItem[]);
        const errors = results
          .map((result) => result.error)
          .filter((error) => !!error)
          .join('. ');
        if (existings && existings.length > 0) {
          const toDelete = existings.filter((id) => !currentIds.includes(id));
          items.push(...toDelete.map((id) => ({ uuid: id, originalId: id, title: '', metadata: {}, deleted: true })));
        }
        return {
          items,
          error: errors,
        };
      }),
    );
  }

  private _getFiles(path: string, query?: string): Observable<SearchResults> {
    if (!fs.existsSync(path)) {
      console.error(`Folder ${path} does not exist.`);
      return of({
        items: [],
        error: `Folder ${path} does not exist.`,
      });
    }
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
      title: path.basename(file) || '',
      originalId: file,
      mimeType: lookup(file) || 'application/octet-stream',
      metadata: {
        path: this.processPath(file),
      },
      status: FileStatus.PENDING,
      uid: '',
    }));
  }

  private processPath(path: string) {
    if (os.platform() === 'win32') {
      // Replace back slashes with forward slashes so that uploaded resources can be filtered by path
      return path.replace(/\\/g, '/');
    }
    return path;
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
