import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface GetAllSyncUseCase {
  execute(): Promise<{ [id: string]: SyncEntity }>;
}

export class GetAllSync implements GetAllSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute() {
    return await this.repository.getAllSync();
  }
}
