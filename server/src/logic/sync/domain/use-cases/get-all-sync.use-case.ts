import { ISyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface GetAllSyncUseCase {
  execute(): Promise<{ [id: string]: ISyncEntity }>;
}

export class GetAllSync implements GetAllSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute() {
    return await this.repository.getAllSync();
  }
}
