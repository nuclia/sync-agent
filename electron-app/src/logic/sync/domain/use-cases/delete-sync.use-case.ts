import { CustomError } from '../../../errors';
import { ISyncRepository } from '../sync.repository';

export interface DeleteSyncUseCase {
  execute(id: string): Promise<void>;
}

export class DeleteSync implements DeleteSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    await this.repository.deleteSync(id);
  }
}
