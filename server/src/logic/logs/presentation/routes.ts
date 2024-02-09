import { Response, Router } from 'express';
import { CustomError } from '../../errors';
import { DeleteLogs } from '../domain/use-cases/delete-logs.use-case';
import { GetLogs } from '../domain/use-cases/get-logs.use-case';
import { FileSystemLogDatasource } from '../infrastructure/file-system.log.datasource';
import { LogRepository } from '../infrastructure/log.repository';

export class LogsFileSystemRoutes {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private handleError = (res: Response, error: unknown) => {
    console.error(error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  };

  getRoutes(): Router {
    const router = Router();
    const datasource = new FileSystemLogDatasource(this.basePath);
    const logRepository = new LogRepository(datasource);

    router.get('/', async (_req, res) => {
      try {
        const data = await new GetLogs(logRepository).execute();
        res.status(200).send(data);
      } catch (error) {
        this.handleError(res, error);
      }
    });

    router.get('/:since', async (_req, res) => {
      res.status(200).send([]);
    });

    router.delete('/', async (_req, res) => {
      try {
        await new DeleteLogs(logRepository).execute();
        res.status(200).send({
          message: 'Logs deleted',
        });
      } catch (error) {
        this.handleError(res, error);
      }
    });

    return router;
  }
}
