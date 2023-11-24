import { Classification, Connector, NucliaOptions } from '../../../types/server';

export enum LogSeverityLevel {
  low = 'low',
  medium = 'medium',
  high = 'high',
}

export interface LogEntityOptions {
  connector: Connector;
  kb: NucliaOptions;
  folders: string[];
  labels?: Classification[];
  title: string;
  id: string;
}

export class SyncEntity {
  public connector: Connector;
  public kb: NucliaOptions;
  public folders: string[];
  public labels: Classification[];
  public title: string;
  public id: string;

  constructor(options: LogEntityOptions) {
    const { connector, kb, folders, labels, title, id } = options;
    this.connector = connector;
    this.kb = kb;
    this.folders = folders;
    this.labels = labels || [];
    this.title = title;
    this.id = id;
  }

  static fromJson = (json: string): SyncEntity => {
    json = json === '' ? '{}' : json;
    const { connector, kb, folders, labels, title, id } = JSON.parse(json);
    const log = new SyncEntity({
      connector,
      kb,
      folders,
      labels,
      title,
      id,
    });
    return log;
  };

  serializeToJson() {
    return {
      id: this.id,
      connector: this.connector,
      kb: this.kb,
      folders: this.folders,
      labels: this.labels,
      title: this.title,
    };
  }
}
