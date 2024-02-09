import { firstValueFrom } from 'rxjs';

import { SearchResults } from '../../../connector/domain/connector';
import { CustomError } from '../../../errors';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';
import { RefreshAccessToken } from './refresh-access-token.use-case';

export interface GetSyncFoldersUseCase {
  execute(id: string): Promise<SearchResults>;
}

export class GetSyncFolders implements GetSyncFoldersUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Get sync folders: Sync with id ${id} not found`, 404);
    }

    try {
      const syncEntity = new SyncEntity(data);
      const updatedEntity = await firstValueFrom(new RefreshAccessToken(this.repository).execute(syncEntity));
      return await firstValueFrom(updatedEntity.allFolders.pipe());
    } catch (error) {
      throw new CustomError(`Error getting folders for sync with id ${id}`, 500);
    }
  }
}
