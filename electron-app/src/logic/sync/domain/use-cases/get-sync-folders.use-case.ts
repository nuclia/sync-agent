import { firstValueFrom } from 'rxjs';

import { SearchResults } from '../../../connector/domain/connector';
import { CustomError } from '../../../errors';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';

export interface GetSyncFoldersUseCase {
  execute(id: string): Promise<SearchResults>;
}

export class GetSyncFolders implements GetSyncFoldersUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    const syncEntity = new SyncEntity(data);
    const dataFolders = await firstValueFrom(syncEntity.folders.pipe());
    return dataFolders;
  }
}
