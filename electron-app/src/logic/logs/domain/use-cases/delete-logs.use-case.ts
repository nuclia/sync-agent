import { ILogRepository } from '../log.repository';

export interface DeleteLogsUseCase {
  execute(): Promise<void>;
}

export class DeleteLogs implements DeleteLogsUseCase {
  constructor(private readonly repository: ILogRepository) {}

  execute(): Promise<void> {
    return this.repository.deleteLogs();
  }
}
