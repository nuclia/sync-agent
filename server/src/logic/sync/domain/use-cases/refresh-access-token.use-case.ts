import { concatMap, Observable, of } from 'rxjs';
import { UpdateSyncDto } from '../dto/update-sync.dto';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';
import { UpdateSync } from './update-sync.use-case';

export interface RefreshAccessTokenUseCase {
  execute(entity: SyncEntity): Observable<SyncEntity>;
}

export class RefreshAccessToken implements RefreshAccessTokenUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  execute(entity: SyncEntity) {
    const observable = entity.isAccessTokenValid().pipe(
      concatMap((isValid) => {
        if (!isValid) {
          return entity.refreshAuthentication().pipe(
            concatMap(async (success) => {
              if (success) {
                const newParams = entity.getConnectorParameters();
                const [, updateSyncDto] = UpdateSyncDto.create({
                  connector: {
                    ...entity.connector,
                    parameters: newParams,
                  },
                  id: entity.id,
                });
                await new UpdateSync(this.repository).execute(updateSyncDto!);
              } else {
                throw new Error(`Failed to refresh authentication for ${entity.id}`);
              }
              return entity;
            }),
          );
        }
        return of(entity);
      }),
    );
    return observable;
  }
}
