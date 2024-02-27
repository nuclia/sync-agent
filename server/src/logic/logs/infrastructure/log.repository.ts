import { ILogDatasource } from '../domain/log.datasource';
import { LogEntity } from '../domain/log.entity';
import { ILogRepository } from '../domain/log.repository';

export class LogRepository implements ILogRepository {
  constructor(private readonly logDatasource: ILogDatasource) {}

  async saveLog(log: LogEntity): Promise<void> {
    return this.logDatasource.saveLog(log);
  }

  async getLogs(sync?: string, since?: string): Promise<LogEntity[]> {
    return this.logDatasource.getLogs(sync, since);
  }

  async deleteLogs(): Promise<void> {
    return this.logDatasource.deleteLogs();
  }
}
