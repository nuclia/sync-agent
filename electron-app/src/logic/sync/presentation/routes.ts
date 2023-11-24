import { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pathExists } from '../../../fileSystemFn';
import { CustomError } from '../../errors';
import { SyncEntity } from '../domain/sync.entity';
import { CreateSync } from '../domain/use-cases/create-sync.use-case';
import { DeleteSync } from '../domain/use-cases/delete-sync.use-case';
import { GetAllSync } from '../domain/use-cases/get-all-sync.use-case';
import { GetSync } from '../domain/use-cases/get-sync.use-case';
import { UpdateSync } from '../domain/use-cases/update-sync.use-case';
import { FileSystemSyncDatasource } from '../infrastructure/file-system.sync.datasource';
import { SyncRepository } from '../infrastructure/sync.repository';

export class SyncFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private handleError = (res: Response, error: unknown) => {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    // grabar log
    res.status(500).json({ error: 'Internal server error' });
  };

  getRoutes(): Router {
    const router = Router();
    const datasource = new FileSystemSyncDatasource(this.basePath);
    const syncRepository = new SyncRepository(datasource);

    router.use('/', async (_req, res, next) => {
      if (!(await pathExists(`${this.basePath}/sync.json`))) {
        res.status(404).send({ error: 'Nuclia folder not found' });
        return;
      }
      next();
    });

    router.get('/', async (_req, res) => {
      try {
        const data = await new GetAllSync(syncRepository).execute();
        res.status(200).send(data);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.post('/', async (req, res) => {
      const dataNewSync = req.body;
      const id = uuidv4();
      const newSync = new SyncEntity({
        ...dataNewSync,
        id,
      });
      try {
        await new CreateSync(syncRepository).execute(newSync);
        res.status(201).send({
          id: newSync.id,
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const data = await new GetSync(syncRepository).execute(id);
        res.status(200).send(data);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.patch('/:id', async (req, res) => {
      const { id } = req.params;
      const dataNewSync = req.body;
      try {
        await new UpdateSync(syncRepository).execute(id, dataNewSync);
        res.status(204).send(null);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.delete('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        await new DeleteSync(syncRepository).execute(id);
        res.status(200).send(null);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    return router;
  }
}
