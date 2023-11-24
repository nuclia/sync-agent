import { Router } from 'express';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { pathExists } from '../../fileSystemFn';

export class SyncFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRoutes(): Router {
    const router = Router();

    router.use('/', async (_req, res, next) => {
      if (!(await pathExists(`${this.basePath}/sync.json`))) {
        res.status(404).send({ error: 'Nuclia folder not found' });
        return;
      }
      next();
    });

    router.get('/', async (_req, res) => {
      const data = await fs.readFile(`${this.basePath}/sync.json`, 'utf8');
      res.status(200).send(JSON.parse(data));
    });

    router.post('/', async (req, res) => {
      const dataNewSync = req.body;
      const uuid = uuidv4();

      const currentSync = JSON.parse(await fs.readFile(`${this.basePath}/sync.json`, 'utf8'));
      const syncAlreadyExists = uuid in currentSync;
      if (syncAlreadyExists) {
        res.status(409).send({
          reason: `Sync with id ${dataNewSync.id} already exists`,
        });
        return;
      }
      currentSync[uuid] = dataNewSync;
      await fs.writeFile(`${this.basePath}/sync.json`, JSON.stringify(currentSync, null, 2));

      res.status(201).send({
        id: dataNewSync.id,
      });
    });

    router.get('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const currentSync = JSON.parse(await fs.readFile(`${this.basePath}/sync.json`, 'utf8'));
        if (!(id in currentSync)) {
          res.status(404).send(null);
        } else {
          res.status(200).send(currentSync[id]);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    router.patch('/:id', async (req, res) => {
      const { id } = req.params;
      const dataNewSync = req.body;
      try {
        const currentSync = JSON.parse(await fs.readFile(`${this.basePath}/sync.json`, 'utf8'));
        if (!(id in currentSync)) {
          res.status(404).send(null);
        } else {
          currentSync[id] = {
            ...currentSync[id],
            ...dataNewSync,
          };

          await fs.writeFile(`${this.basePath}/sync.json`, JSON.stringify(currentSync, null, 2));
          res.status(204).send(null);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    router.delete('/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const currentSync = JSON.parse(await fs.readFile(`${this.basePath}/sync.json`, 'utf8'));
        if (!(id in currentSync)) {
          res.status(404).send(null);
        } else {
          delete currentSync[id];
          await fs.writeFile(`${this.basePath}/sync.json`, JSON.stringify(currentSync, null, 2));
          res.status(200).send(null);
        }
      } catch (error) {
        console.error(error);
        res.status(404).send(null);
      }
    });

    return router;
  }
}
