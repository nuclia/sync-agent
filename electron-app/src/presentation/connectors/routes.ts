import { Router } from 'express';

export class ConnectorsRoutes {
  constructor() {}

  getRoutes(): Router {
    const router = Router();

    router.get('/', async (_req, res) => {
      res.status(200).send([]);
    });

    return router;
  }
}
