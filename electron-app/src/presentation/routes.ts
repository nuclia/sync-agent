import { Router } from 'express';

import { SyncFileSystemRoutes } from './sync/routes';

export class AppFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRoutes(): Router {
    const router = Router();
    const syncFileSystemRoutes = new SyncFileSystemRoutes(this.basePath);
    router.use('/sync', syncFileSystemRoutes.getRoutes());
    return router;
  }
}
