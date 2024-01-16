import { EVENTS } from './events';
import { beforeStartServer } from './fileSystemServerFn';
import { AppFileSystemRoutes } from './presentation/routes';
import { syncAllFoldersFileSystemProcess } from './process-sync';
import { Server, eventEmitter } from './server';
import { initFileSystemSubscribers } from './subscribers';

export const initFileSystemServer = async ({
  basePath,
  secondsForAutoSync = 3600, // 1h
  startAutoSyncProcess = true,
}: {
  basePath: string;
  secondsForAutoSync?: number;
  startAutoSyncProcess?: boolean;
}) => {
  const appRoutes = new AppFileSystemRoutes(basePath);
  const server = new Server({ port: 8000, routes: appRoutes.getRoutes() });
  initFileSystemSubscribers(basePath);
  await beforeStartServer(basePath);

  if (startAutoSyncProcess) {
    setInterval(() => {
      syncAllFoldersFileSystemProcess(basePath);
    }, secondsForAutoSync * 1000);
  }

  return server;
};

export { EVENTS, eventEmitter };
