import { EVENTS } from './events';
import { beforeStartServer } from './fileSystemServerFn';
import { AppFileSystemRoutes } from './presentation/routes';
import { syncAllFoldersFileSystemProcess } from './process-sync';
import { Server, eventEmitter } from './server';
import { initFileSystemSubscribers } from './subscribers';

type ServerOptions = {
  secondsForAutoSync?: number;
  startAutoSyncProcess?: boolean;
  port?: number;
};

type FileSystemServerOptions = {
  basePath: string;
} & ServerOptions;

export const initFileSystemServer = async ({
  basePath,
  secondsForAutoSync = 3600, // 1h
  startAutoSyncProcess = true,
  port = 8080,
}: FileSystemServerOptions) => {
  const appRoutes = new AppFileSystemRoutes(basePath);
  const server = new Server({ port, routes: appRoutes.getRoutes() });
  initFileSystemSubscribers(basePath);
  await beforeStartServer(basePath);

  if (startAutoSyncProcess) {
    syncAllFoldersFileSystemProcess(basePath);
    setInterval(() => {
      syncAllFoldersFileSystemProcess(basePath);
    }, secondsForAutoSync * 1000);
  }

  return server;
};

export { EVENTS, eventEmitter };
