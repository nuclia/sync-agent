import { Router } from 'express';

import { SourceFileSystemRoutes } from './source/routes';

export class AppFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRoutes(): Router {
    const router = Router();
    const sourceFileSystemRoutes = new SourceFileSystemRoutes(this.basePath);
    router.use('/sources', sourceFileSystemRoutes.getRoutes());
    return router;
  }
}
