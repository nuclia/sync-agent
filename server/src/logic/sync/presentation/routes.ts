import { Response, Router } from 'express';
import { pathExists } from '../../../fileSystemFn';
import { CustomError } from '../../errors';
import { CreateSyncDto } from '../domain/dto/create-sync.dto';
import { UpdateSyncDto } from '../domain/dto/update-sync.dto';
import { CreateSync } from '../domain/use-cases/create-sync.use-case';
import { DeleteSync } from '../domain/use-cases/delete-sync.use-case';
import { GetAllSync } from '../domain/use-cases/get-all-sync.use-case';
import { GetSyncAuth } from '../domain/use-cases/get-sync-auth.use-case';
import { GetSyncFolders } from '../domain/use-cases/get-sync-folders.use-case';
import { GetSync } from '../domain/use-cases/get-sync.use-case';
import { SyncAllFolders } from '../domain/use-cases/sync-all-folders-data.use-case';
import { UpdateSync } from '../domain/use-cases/update-sync.use-case';
import { FileSystemSyncDatasource } from '../infrastructure/file-system.sync.datasource';
import { SyncRepository } from '../infrastructure/sync.repository';
import { SyncEntity } from '../domain/sync.entity';

export class SyncFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private handleError = (res: Response, error: unknown) => {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    // grabar log
    res.status(500).json({ message: 'Internal server error' });
  };

  getRoutes(): Router {
    const router = Router();
    const datasource = new FileSystemSyncDatasource(this.basePath);
    const syncRepository = new SyncRepository(datasource);

    router.use('/', async (_req, res, next) => {
      if (!(await pathExists(`${this.basePath}/sync.json`))) {
        res.status(404).send({ message: 'Nuclia folder not found' });
        return;
      }
      next();
    });

    router.get('/kb/:kb', async (_req, res) => {
      try {
        const allSyncs = await new GetAllSync(syncRepository).execute();
        const kbSyncs = Object.values(allSyncs)
          .filter((sync) => sync.kb.knowledgeBox === _req.params.kb)
          .map((sync) => ({
            id: sync.id,
            title: sync.title,
            connector: sync.connector.name,
            lastSyncGMT: sync.lastSyncGMT,
            disabled: sync.disabled,
            totalSyncedResources: sync.originalIds?.length || 0,
          }));
        res.status(200).send(kbSyncs);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/execute', async (_req, res) => {
      try {
        await new SyncAllFolders(syncRepository).executeAll();
        res.status(200).send({ success: true });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/execute/:syncId', async (req, res) => {
      try {
        const { syncId } = req.params;
        const sync = await new GetSync(syncRepository).execute(syncId);
        await new SyncAllFolders(syncRepository).execute(sync);
        res.status(200).send({ success: true });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.post('/', async (req, res) => {
      const [error, createSyncDto] = CreateSyncDto.create(req.body);
      if (error) return res.status(400).json({ error });
      try {
        await new CreateSync(syncRepository).execute(createSyncDto!);
        res.status(201).send({
          id: createSyncDto!.values.id,
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        await this.checkAuth(id, req.headers.token as string, syncRepository);
        const data = await new GetSync(syncRepository).execute(id);
        // remove originalIds from response (too big)
        delete data.originalIds;
        res.status(200).send(data);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/:id/auth', async (req, res) => {
      const { id } = req.params;
      try {
        const data = await new GetSyncAuth(syncRepository).execute(id);
        res.status(200).send({ hasAuth: data });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/:id/folders', async (req, res) => {
      const { id } = req.params;
      try {
        await this.checkAuth(id, req.headers.token as string, syncRepository);
        const data = await new GetSyncFolders(syncRepository).execute(id);
        res.status(200).send(data);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.patch('/:id', async (req, res) => {
      const { id } = req.params;
      const [error, updateSyncDto] = UpdateSyncDto.create({ ...req.body, id });
      if (error) return res.status(400).json({ message: error });

      try {
        await this.checkAuth(id, req.headers.token as string, syncRepository);
        await new UpdateSync(syncRepository).execute(updateSyncDto!);
        res.status(204).send(null);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.delete('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        await this.checkAuth(id, req.headers.token as string, syncRepository);
        await new DeleteSync(syncRepository).execute(id);
        res.status(200).send(null);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    return router;
  }

  private async checkAuth(id: string, auth: string, syncRepository: SyncRepository) {
    if (!auth) {
      throw new CustomError('Check auth: No auth token provided', 401);
    }
    const data = await syncRepository.getSync(id);
    if (data === null) {
      throw new CustomError(`Check auth: Sync with id ${id} not found`, 404);
    }
    const syncEntity = new SyncEntity(data);
    const checkAuth = await syncEntity.checkNucliaAuth(auth);
    if (!checkAuth) {
      throw new CustomError(`Check auth: Auth for sync with id ${id} not valid`, 401);
    }
  }
}
