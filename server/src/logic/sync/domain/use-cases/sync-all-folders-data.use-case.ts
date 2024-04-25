/* eslint-disable @typescript-eslint/no-explicit-any */
import { concatMap, delay, filter, from, lastValueFrom, map, of, switchMap, toArray } from 'rxjs';

import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { FileStatus, SyncItem } from '../../../connector/domain/connector';
import { UpdateSyncDto } from '../dto/update-sync.dto';
import { SyncEntity } from '../sync.entity';
import { ISyncRepository } from '../sync.repository';
import { RefreshAccessToken } from './refresh-access-token.use-case';
import { SyncSingleFile } from './sync-single-file.use-case';
import { UpdateSync } from './update-sync.use-case';
import { lookup } from 'mime-types';

require('localstorage-polyfill');

export interface SyncAllFoldersUseCase {
  execute(since: Date | undefined): Promise<void>;
}

export class SyncAllFolders implements SyncAllFoldersUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  callbackFinishSync = (
    syncEntity: SyncEntity,
    processed: string[],
    deleted: string[],
    successCount: number,
    error?: string,
  ) => {
    eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SYNC_OBJECT, {
      from: syncEntity.id,
      to: syncEntity.kb?.knowledgeBox || 'Unknown kb',
      date: new Date().toISOString(),
      processed: [...processed, ...deleted],
      successCount,
      error,
    });

    const foldersToSyncCopy = (structuredClone(syncEntity.foldersToSync) ?? []).map((folder) => {
      folder.status = FileStatus.UPLOADED;
      return folder;
    });

    const ids = new Set([...(syncEntity.originalIds || []).filter((id) => !deleted.includes(id)), ...processed]);
    const [message, updateSyncDto] = UpdateSyncDto.create({
      lastSyncGMT: new Date().toISOString(),
      id: syncEntity.id,
      foldersToSync: foldersToSyncCopy,
      originalIds: [...ids],
    });
    if (updateSyncDto) {
      return from(new UpdateSync(this.repository).execute(updateSyncDto));
    } else {
      throw new Error(`Error updating sync: ${message}`);
    }
  };

  processSyncEntity(syncEntity: SyncEntity) {
    return syncEntity.getLastModified(syncEntity.originalIds).pipe(
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
          return this.callbackFinishSync(syncEntity, [], [], 0, result.error);
        }
        return this.processItems(syncEntity, result.results);
      }),
    );
  }

  processItems(syncEntity: SyncEntity, items: SyncItem[]) {
    const filteredMimetypes = (syncEntity.filters?.fileExtensions?.extensions || '')
      .split(',')
      .map((ext) => lookup(ext.trim()) || '')
      .filter((ext) => ext);
    return of(...items).pipe(
      filter((item) => {
        let isExtensionOk = true;
        if (filteredMimetypes.length > 0) {
          const isFiltered = filteredMimetypes.includes(item.mimeType || '');
          isExtensionOk = syncEntity.filters?.fileExtensions?.exclude ? !isFiltered : isFiltered;
        }
        let isDateOk = true;
        if (item.modifiedGMT && syncEntity.filters?.modified) {
          if (syncEntity.filters.modified.from) {
            isDateOk = item.modifiedGMT >= syncEntity.filters.modified.from;
          }
          if (syncEntity.filters.modified.to) {
            isDateOk = isDateOk && item.modifiedGMT <= syncEntity.filters.modified.to;
          }
        }
        return isDateOk && isExtensionOk;
      }),
      concatMap((item) =>
        new SyncSingleFile(syncEntity, item).execute().pipe(
          map((res) => ({ id: item.originalId, success: res.success, action: item.deleted ? 'delete' : 'upload' })),
          // do not overwhelm the source
          delay(500),
        ),
      ),
      toArray(),
    );
  }

  async execute() {
    const syncObjects = await this.repository.getAllSync();
    const syncObjectValues = Object.values(syncObjects).filter((sync) => !sync.disabled);
    if (syncObjectValues.length > 0) {
      await lastValueFrom(
        of(...syncObjectValues).pipe(
          concatMap((syncObj) => new RefreshAccessToken(this.repository).execute(new SyncEntity(syncObj))),
          concatMap((syncEntity) =>
            this.processSyncEntity(syncEntity).pipe(
              concatMap((result) => {
                if (result) {
                  const processed = result.filter((res) => res.success && res.action === 'upload').map((res) => res.id);
                  const deleted = result.filter((res) => res.success && res.action === 'delete').map((res) => res.id);
                  const successCount = result.filter((res) => res.success).length;

                  console.log('processed', processed);
                  console.log('deleted', deleted);
                  console.log('successCount', successCount);
                  return this.callbackFinishSync(syncEntity, processed, deleted, successCount, '');
                } else {
                  return of(undefined);
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
