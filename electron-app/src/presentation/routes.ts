import { Router } from 'express';

import { LogsFileSystemRoutes } from '../logic/logs/presentation/routes';
import { SyncFileSystemRoutes } from '../logic/sync/presentation/routes';

export class AppFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRoutes(): Router {
    const router = Router();
    const syncFileSystemRoutes = new SyncFileSystemRoutes(this.basePath);
    const logsFileSystemRoutes = new LogsFileSystemRoutes(this.basePath);
    router.use('/sync', syncFileSystemRoutes.getRoutes());
    router.use('/logs', logsFileSystemRoutes.getRoutes());
    return router;
  }
}
