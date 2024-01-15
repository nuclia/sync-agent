import { ILogDatasource } from '../domain/log.datasource';
import { LogEntity } from '../domain/log.entity';
import { ILogRepository } from '../domain/log.repository';

export class LogRepository implements ILogRepository {
  constructor(private readonly logDatasource: ILogDatasource) {}

  async saveLog(log: LogEntity): Promise<void> {
    return this.logDatasource.saveLog(log);
  }

  async getLogs(): Promise<LogEntity[]> {
    return this.logDatasource.getLogs();
  }

  async deleteLogs(): Promise<void> {
    return this.logDatasource.deleteLogs();
  }
}
