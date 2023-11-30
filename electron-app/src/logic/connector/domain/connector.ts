/* eslint-disable @typescript-eslint/no-explicit-any */
import { Observable } from 'rxjs';

export enum FileStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  UPLOADED = 'UPLOADED',
}

export interface Link {
  uri: string;
  extra_headers: { [key: string]: string };
}

export interface ConnectorParameters {
  [key: string]: any;
}

export interface SyncItem {
  uuid?: string;
  title: string;
  originalId: string;
  metadata: { [key: string]: string };
  status: FileStatus;
  modifiedGMT?: string;
  isFolder?: boolean;
}

export interface SearchResults {
  items: SyncItem[];
  nextPage?: Observable<SearchResults>;
}

export interface Field {
  id: string;
  label: string;
  help?: string;
  type: 'text' | 'select' | 'folder' | 'textarea';
  options?: { label: string; value: string; disabled?: boolean }[];
  required?: boolean;
  canBeRefreshed?: boolean;
}

export interface IConnector {
  isExternal: boolean;
  setParameters(params: ConnectorParameters): void;
  areParametersValid(params: ConnectorParameters): boolean;
  getParameters(): ConnectorParameters;
  getFolders(query?: string): Observable<SearchResults>;
  getFiles(query?: string): Observable<SearchResults>;
  getLastModified(since: string, folders?: SyncItem[]): Observable<SyncItem[]>;
  // we cannot use the TextField from the SDK because we want to keep connectors independant
  download(resource: SyncItem): Observable<Blob | { body: string; format?: 'PLAIN' | 'MARKDOWN' | 'HTML' } | undefined>;
  getLink(resource: SyncItem): Observable<Link>;
  hasAuthData(): boolean;
  refreshAuthentication(): Observable<boolean>;
}
