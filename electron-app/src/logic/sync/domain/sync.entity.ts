import { Observable, catchError, concatMap, of } from 'rxjs';

import { IConnector, SearchResults } from '../../connector/domain/connector';
import { getConnector } from '../../connector/infrastructure/factory';

export type Connector = {
  name: 'gdrive' | 'folder';
  logo: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: { [key: string]: any };
};

export interface NucliaOptions {
  /**
   * The Nuclia backend to use.
   *
   * Example: `https://nuclia.cloud/api` */
  backend: string;
  /**
   * The geographical zone for the regional API calls.
   *
   * Example: `europe-1` */
  zone: string;
  /**
   * The Nuclia Knowledge Box unique id.
   *
   * Example: `17815eb2-06a5-40ee-a5aa-b2f9dbc5da70` */
  knowledgeBox: string;
  /**
   * Allows you to make calls to a private Knowledge Box.
   *
   * It can be used in a server-side app, but never in a web app.
   */
  apiKey: string;
}

export type Classification = {};

export interface ISyncEntity {
  connector: Connector;
  kb: NucliaOptions;
  labels?: Classification[];
  title: string;
  id: string;
}

export class SyncEntity {
  public connector: Connector;
  public kb: NucliaOptions;
  public labels?: Classification[];
  public title: string;
  public id: string;
  private sourceConnector?: IConnector;

  constructor(options: ISyncEntity) {
    const { connector, kb, labels, title, id } = options;
    this.connector = connector;
    this.kb = kb;
    this.labels = labels;
    this.title = title;
    this.id = id;
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

  get folders(): Observable<SearchResults> {
    if (!this.sourceConnector) {
      return of({
        items: [],
      });
    }
    return this.sourceConnector.getFolders().pipe(
      catchError(() => {
        return this.sourceConnector!.refreshAuthentication().pipe(
          concatMap((success) => {
            if (success) {
              const newParams = this.sourceConnector!.getParameters();
              this.connector.parameters = newParams;
              return this.sourceConnector!.getFolders();
            } else {
              throw new Error('Failed to refresh authentication');
            }
          }),
        );
      }),
    );
  }
}
