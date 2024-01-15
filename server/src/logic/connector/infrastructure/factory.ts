import { IConnector } from '../domain/connector';
import { DropboxConnector } from './connectors/dropbox.connector';
import { FolderConnector } from './connectors/folder.connector';
import { GDriveConnector } from './connectors/gdrive.connector';
import { OneDriveConnector } from './connectors/onedrive.connector';
import { SharepointConnector } from './connectors/sharepoint.connector';

export interface ConnectorDefinition {
  id: string;
}
export interface ConnectorSettings {
  [key: string]: string;
}

export interface SourceConnectorDefinition extends ConnectorDefinition {
  factory: (data?: ConnectorSettings) => IConnector;
}

export type CONNECTORS_NAMES = 'folder' | 'gdrive';
const connectors: { [id: string]: SourceConnectorDefinition } = {
  folder: FolderConnector,
  gdrive: GDriveConnector,
  dropbox: DropboxConnector,
  onedrive: OneDriveConnector,
  sharepoint: SharepointConnector,
};

// TODO: add the dynamic connectors

export const getConnector = (id: CONNECTORS_NAMES) => {
  return connectors[id];
};
