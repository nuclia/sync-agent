import { SyncAllFolders } from './logic/sync/domain/use-cases/sync-all-folders-data.use-case';
import { FileSystemSyncDatasource } from './logic/sync/infrastructure/file-system.sync.datasource';
import { SyncRepository } from './logic/sync/infrastructure/sync.repository';

export const syncAllFoldersFileSystemProcess = (basePath: string): Promise<void> => {
  const datasource = new FileSystemSyncDatasource(basePath);
  const syncRepository = new SyncRepository(datasource);
  return new SyncAllFolders(syncRepository).execute();
};
