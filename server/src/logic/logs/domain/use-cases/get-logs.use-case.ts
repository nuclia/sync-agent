import { LogEntity } from '../log.entity';
import { ILogRepository } from '../log.repository';

export interface GetLogUseCase {
  execute(): Promise<LogEntity[]>;
}

export class GetLogs implements GetLogUseCase {
  constructor(private readonly repository: ILogRepository) {}

  execute(): Promise<LogEntity[]> {
    return this.repository.getLogs();
  }
}
