import { LogEntity } from '../log.entity';
import { ILogRepository } from '../log.repository';

export interface GetLogUseCase {
  execute(sync?: string): Promise<LogEntity[]>;
}

export class GetLogs implements GetLogUseCase {
  constructor(private readonly repository: ILogRepository) {}

  execute(sync?: string, since?: string): Promise<LogEntity[]> {
    return this.repository.getLogs(sync, since);
  }
}
