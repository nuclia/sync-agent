import { CustomError } from '../../../errors';
import { ISyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface GetSyncUseCase {
  execute(id: string): Promise<ISyncEntity>;
}

export class GetSync implements GetSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    return data;
  }
}
