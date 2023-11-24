import { LogEntity } from './log.entity';

export abstract class ILogRepository {
  abstract saveLog(log: LogEntity): Promise<void>;
  abstract getLogs(): Promise<LogEntity[]>;
  abstract deleteLogs(): Promise<void>;
}
