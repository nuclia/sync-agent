import { CustomError } from '../../../errors';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface GetSyncAuthUseCase {
  execute(id: string): Promise<boolean>;
}

export class GetSyncAuth implements GetSyncAuthUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    return new SyncEntity(data).hasAuthData();
  }
}
