import { CustomError } from '../../../errors';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface CreateSyncUseCase {
  execute(sync: SyncEntity): Promise<void>;
}

export class CreateSync implements CreateSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(sync: SyncEntity): Promise<void> {
    const data = await this.repository.getSync(sync.id);
    if (data !== null) {
      throw new CustomError(`Sync with id ${sync.id} already exists`, 409);
    }
    await this.repository.createSync(sync);
    // publish event create sync
    return Promise.resolve();
  }
}
