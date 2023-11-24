import { CustomError } from '../../../errors';
import { LogEntityOptions, SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface UpdateSyncUseCase {
  execute(id: string, newSyncOpt: LogEntityOptions): Promise<void>;
}

export class UpdateSync implements UpdateSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string, newSyncOpt: LogEntityOptions) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    // const dataSeralized = data.serializeToJson();
    console.log('Before Update newSync', data, newSyncOpt);
    const newSync = new SyncEntity({ ...data.serializeToJson(), ...newSyncOpt });
    console.log('Update newSync', newSync);
    await this.repository.updateSync(id, newSync);
  }
}
