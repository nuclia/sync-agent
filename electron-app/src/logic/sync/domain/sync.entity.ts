import { Observable, catchError, map, of } from 'rxjs';

import { z } from 'zod';
import { IConnector, SearchResults, SyncItem } from '../../connector/domain/connector';
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
  backend: z.string({ required_error: 'backend is required' }).min(1, { message: 'backend is required' }),
  /**
   * The geographical zone for the regional API calls.
   *
   * Example: `europe-1` */
  zone: z.string({ required_error: 'zone is required' }).min(1, { message: 'zone is required' }),
  /**
   * The Nuclia Knowledge Box unique id.
   *
   * Example: `17815eb2-06a5-40ee-a5aa-b2f9dbc5da70` */
  knowledgeBox: z
    .string({ required_error: 'knowledgeBox is required' })
    .min(1, { message: 'knowledgeBox is required' }),
  /**
   * Allows you to make calls to a private Knowledge Box.
   *
   * It can be used in a server-side app, but never in a web app.
   */
  apiKey: z.string({ required_error: 'apiKey is required' }).min(1, { message: 'apiKey is required' }),
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
    try {
      return this.sourceConnector!.getLastModified(
        this.lastSyncGMT || '2000-01-01T00:00:00.000Z',
        this.foldersToSync,
      ).pipe(
        map((results) => {
          return { success: true, results };
        }),
        catchError((err) => {
          console.error(`Error on ${this.id}: ${err.message}`);
          return of({ success: false, results: [], error: `${err}` });
        }),
      );
    } catch (err) {
      return of({ success: false, results: [], error: `${err}` });
    }
  }

  isAccesTokenValid(): Observable<boolean> {
    return this.sourceConnector!.isAccesTokenValid();
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
