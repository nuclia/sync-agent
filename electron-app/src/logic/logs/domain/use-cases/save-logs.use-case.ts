import { LogEntity } from '../log.entity';
import { ILogRepository } from '../log.repository';

export interface SaveLogsUseCase {
  execute(log: LogEntity): Promise<void>;
}

export class SaveLogs implements SaveLogsUseCase {
  constructor(private readonly repository: ILogRepository) {}

  execute(log: LogEntity): Promise<void> {
    return this.repository.saveLog(log);
  }
}
