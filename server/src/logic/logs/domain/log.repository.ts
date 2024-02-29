import { LogEntity } from './log.entity';

export abstract class ILogRepository {
  abstract saveLog(log: LogEntity): Promise<void>;
  abstract getLogs(sync?: string, since?: string): Promise<LogEntity[]>;
  abstract deleteLogs(): Promise<void>;
}
