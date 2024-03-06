/* eslint-disable @typescript-eslint/no-explicit-any */
import { concatMap, delay, lastValueFrom, map, of, switchMap, tap, toArray, zip } from 'rxjs';

import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { FileStatus, SyncItem } from '../../../connector/domain/connector';
import { UpdateSyncDto } from '../dto/update-sync.dto';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';
import { RefreshAccessToken } from './refresh-access-token.use-case';
import { SyncSingleFile } from './sync-single-file.use-case';
import { UpdateSync } from './update-sync.use-case';

require('localstorage-polyfill');

export interface SyncAllFoldersUseCase {
  execute(since: Date | undefined): Promise<void>;
}

export class SyncAllFolders implements SyncAllFoldersUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  callbackFinishSync = (syncEntity: SyncEntity, processed: string[], successCount: number, error?: string) => {
    eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SYNC_OBJECT, {
      from: syncEntity.id,
      to: syncEntity.kb?.knowledgeBox || 'Unknown kb',
      date: new Date().toISOString(),
      processed,
      successCount,
      error,
    });

    const foldersToSyncCopy = (structuredClone(syncEntity.foldersToSync) ?? []).map((folder) => {
      folder.status = FileStatus.UPLOADED;
      return folder;
    });

    const [, updateSyncDto] = UpdateSyncDto.create({
      lastSyncGMT: new Date().toISOString(),
      id: syncEntity.id,
      foldersToSync: foldersToSyncCopy,
    });
    new UpdateSync(this.repository).execute(updateSyncDto!);
  };

  processSyncEntity(syncEntity: SyncEntity) {
    return syncEntity.getLastModified().pipe(
      map((result) => {
        return { result, syncEntity };
      }),
      switchMap(({ result, syncEntity }) => {
        eventEmitter.emit(EVENTS.START_SYNCHRONIZATION_SYNC_OBJECT, {
          from: syncEntity.id,
          to: syncEntity.kb?.knowledgeBox || 'Unknown kb',
          date: new Date().toISOString(),
          total: result.results?.length || 0,
        });

        if (!result.success || result.results.length === 0) {
          this.callbackFinishSync(syncEntity, [], 0, result.error);
          return of(undefined);
        }
        return this.processItems(syncEntity, result.results);
      }),
    );
  }

  processItems(syncEntity: SyncEntity, items: SyncItem[]) {
    return of(...items).pipe(
      concatMap((item) =>
        new SyncSingleFile(syncEntity, item).execute().pipe(
          map((res) => ({ id: item.originalId, success: res.success })),
          // do not overwhelm the source
          delay(500),
        ),
      ),
      toArray(),
    );
  }

  async execute() {
    const syncObjects = await this.repository.getAllSync();
    const syncObjectValues = Object.values(syncObjects);
    if (syncObjectValues.length > 0) {
      await lastValueFrom(
        of(...syncObjectValues).pipe(
          switchMap((syncObj) => new RefreshAccessToken(this.repository).execute(new SyncEntity(syncObj))),
          switchMap((syncEntity) =>
            this.processSyncEntity(syncEntity).pipe(
              tap((result) => {
                if (result) {
                  const processed = result.map((res) => res.id);
                  const successCount = result.filter((res) => res.success).length;

                  console.log('processed', processed);
                  console.log('successCount', successCount);
                  this.callbackFinishSync(syncEntity, processed, successCount, '');
                }
              }),
            ),
          ),
        ),
      );
      console.log('Finish sync folders data');
    }
  }
}
