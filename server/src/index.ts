import { EVENTS } from './events';
import { beforeStartServer } from './fileSystemServerFn';
import { AppFileSystemRoutes } from './presentation/routes';
import { Server, eventEmitter } from './server';
import { initFileSystemSubscribers } from './subscribers';

export const initFileSystemServer = async (basePath: string) => {
  const appRoutes = new AppFileSystemRoutes(basePath);
  const server = new Server({ port: 8000, routes: appRoutes.getRoutes() });
  initFileSystemSubscribers(basePath);
  await beforeStartServer(basePath);
  return server;
};

export { EVENTS, eventEmitter };
