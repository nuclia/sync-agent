import { LogEntity } from './log.entity';

export abstract class ILogDatasource {
  abstract saveLog(log: LogEntity): Promise<void>;
  abstract getLogs(): Promise<LogEntity[]>;
  abstract deleteLogs(): Promise<void>;
}
