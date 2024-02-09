import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { z } from 'zod';
import { FileStatus, IConnector, SearchResults, SyncItem } from '../../connector/domain/connector';
import { getConnector } from '../../connector/infrastructure/factory';

export type Connector = {
  name: 'gdrive' | 'folder';
  // logo: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: { [key: string]: any };
};

export const NucliaOptionsValidator = z.object({
  /**
   * The Nuclia backend to use.
   *
   * Example: `https://nuclia.cloud/api` */
  backend: z.string().min(1, { message: 'Required' }),
  /**
   * The geographical zone for the regional API calls.
   *
   * Example: `europe-1` */
  zone: z.string().min(1, { message: 'Required' }),
  /**
   * The Nuclia Knowledge Box unique id.
   *
   * Example: `17815eb2-06a5-40ee-a5aa-b2f9dbc5da70` */
  knowledgeBox: z.string().min(1, { message: 'Required' }),
  /**
   * Allows you to make calls to a private Knowledge Box.
   *
   * It can be used in a server-side app, but never in a web app.
   */
  apiKey: z.string().min(1, { message: 'Required' }),
});

export type NucliaOptions = z.infer<typeof NucliaOptionsValidator>;

export type Classification = {};

export interface ISyncEntity {
  connector: Connector;
  kb: NucliaOptions;
  labels?: Classification[];
  title: string;
  id: string;
  lastSyncGMT?: string;
  foldersToSync?: SyncItem[];
}

export class SyncEntity {
  public connector: Connector;
  public kb: NucliaOptions;
  public labels?: Classification[];
  public title: string;
  public id: string;
  public sourceConnector?: IConnector;
  public lastSyncGMT?: string;
  public foldersToSync?: SyncItem[] = [];

  constructor(options: ISyncEntity) {
    const { connector, kb, labels, title, id, lastSyncGMT, foldersToSync } = options;
    this.connector = connector;
    this.kb = kb;
    this.labels = labels;
    this.title = title;
    this.id = id;
    this.lastSyncGMT = lastSyncGMT;
    this.foldersToSync = foldersToSync;
    this.setConnectorDefinition();
  }

  private setConnectorDefinition() {
    const connectorDefinition = getConnector(this.connector?.name || '');
    if (!connectorDefinition) {
      throw new Error(`Connector ${this.connector.name} not defined`);
    }
    this.sourceConnector = connectorDefinition.factory();
    this.sourceConnector.setParameters(this.connector?.parameters ?? {});
  }

  get allFolders(): Observable<SearchResults> {
    if (!this.sourceConnector) {
      return of({
        items: [],
      });
    }
    return this.sourceConnector.getFolders();
  }

  get files(): Observable<SearchResults> {
    if (!this.sourceConnector) {
      return of({
        items: [],
      });
    }
    return this.sourceConnector.getFiles();
  }

  getLastModified(): Observable<{ success: boolean; results: SyncItem[]; error?: string }> {
    const foldersToSyncPending: SyncItem[] = (this.foldersToSync ?? []).filter(
      (folder) => folder.status === FileStatus.PENDING || folder.status === undefined,
    );
    const foldersToSyncUpdated: SyncItem[] = (this.foldersToSync ?? []).filter(
      (folder) => folder.status === FileStatus.UPLOADED,
    );
    const getFilesFoldersUpdated =
      foldersToSyncUpdated.length > 0
        ? this.sourceConnector!.getLastModified(this.lastSyncGMT || '2000-01-01T00:00:00.000Z', foldersToSyncUpdated)
        : of({ items: [] });

    const getFilesFolderPending =
      foldersToSyncPending.length > 0
        ? this.sourceConnector!.getFilesFromFolders(foldersToSyncPending)
        : of({ items: [] });
    return forkJoin([getFilesFoldersUpdated, getFilesFolderPending]).pipe(
      map(([updated, pending]) => {
        return { success: true, results: [...updated.items, ...pending.items] };
      }),
      catchError((err) => {
        console.error(`Error on ${this.id}: ${err.message}`);
        return of({ success: false, results: [], error: `${err}` });
      }),
    );
  }

  isAccessTokenValid(): Observable<boolean> {
    return this.sourceConnector!.isAccessTokenValid();
  }

  refreshAuthentication(): Observable<boolean> {
    return this.sourceConnector!.refreshAuthentication();
  }

  getConnectorParameters() {
    return this.sourceConnector!.getParameters();
  }

  hasAuthData() {
    return this.sourceConnector!.hasAuthData();
  }
}
