/* eslint-disable @typescript-eslint/no-explicit-any */
import { Observable, catchError, delay, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { UpdateSyncDto } from '../dto/update-sync.dto';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';
import { RefreshAccessToken } from './refresh-acces-token.use-case';
import { SyncSingleFile } from './sync-single-file.use-case';
import { UpdateSync } from './update-sync.use-case';

require('localstorage-polyfill');

export interface SyncAllDataUseCase {
  execute(since: Date | undefined): Promise<boolean>;
}

export class SyncAllData implements SyncAllDataUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(since: Date | undefined) {
    const syncObjects = await this.repository.getAllSync();
    of(Object.values(syncObjects))
      .pipe(
        switchMap((syncObjectValues) => {
          if (syncObjectValues.length === 0) {
            return of(undefined);
          } else {
            return forkJoin(
              syncObjectValues.map((syncObj) =>
                of(syncObj).pipe(
                  switchMap((syncObj) => new RefreshAccessToken(this.repository).execute(new SyncEntity(syncObj))),
                  switchMap((syncEntity) =>
                    syncEntity.files.pipe(
                      map((files) => {
                        return { files, syncEntity };
                      }),
                    ),
                  ),
                  switchMap(({ files, syncEntity }) => {
                    const items = files.items.slice(0, 10);
                    // addActiveSyncLog(id, source);
                    eventEmitter.emit(EVENTS.START_SYNCHRONIZATION_SYNC_OBJECT, {
                      from: syncEntity.id,
                      to: syncEntity.kb?.knowledgeBox || 'Unknown kb',
                      date: new Date().toISOString(),
                      total: items?.length || 0,
                    });

                    const batch: Observable<{ id: string; success: boolean }>[] = items.map((item) =>
                      of(item).pipe(
                        switchMap((item) =>
                          new SyncSingleFile(syncEntity, item).execute().pipe(
                            map((res) => ({ id: item.originalId, success: res.success })),
                            // do not overwhelm the source
                            delay(500),
                          ),
                        ),
                      ),
                    );

                    return forkJoin(batch).pipe(
                      tap((result) => {
                        if (result) {
                          const processed = result.map((res) => res.id);
                          const successCount = result.filter((res) => res.success).length;

                          console.log('processed', processed);
                          console.log('successCount', successCount);
                          eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SYNC_OBJECT, {
                            from: syncEntity.id,
                            to: syncEntity.kb?.knowledgeBox || 'Unknown kb',
                            date: new Date().toISOString(),
                            processed,
                            successCount,
                          });

                          const [, updateSyncDto] = UpdateSyncDto.create({
                            lastSyncGMT: new Date().toISOString(),
                            id: syncEntity.id,
                          });
                          new UpdateSync(this.repository).execute(updateSyncDto!);
                        }
                      }),
                    );
                  }),
                  catchError(() => {
                    // emit error event
                    return of(undefined);
                  }),
                ),
              ),
            );
          }
        }),
      )
      .subscribe(() => console.log('Finish sync all data'));

    return true;
  }
}
