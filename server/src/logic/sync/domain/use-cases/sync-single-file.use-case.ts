/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextField } from '@nuclia/core';
import { Observable, from, map, of, switchMap, tap } from 'rxjs';

import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { SyncItem } from '../../../connector/domain/connector';
import { NucliaCloud } from '../nuclia-cloud';
import { SyncEntity } from '../sync.entity';

require('localstorage-polyfill');

export interface SyncSingleFileUseCase {
  execute(): Observable<{ success: boolean; message?: string }>;
}

function downloadFileOrLink(
  sync: SyncEntity,
  item: SyncItem,
): Observable<{ type: 'blob' | 'link' | 'text'; blob?: Blob; link?: any; text?: TextField }> {
  const connector = sync.sourceConnector;
  if (connector?.isExternal) {
    return connector.getLink(item).pipe(map((link) => ({ type: 'link', link })));
  } else {
    return connector!
      .download(item)
      .pipe(map((res) => (res instanceof Blob ? { type: 'blob', blob: res } : { type: 'text', text: res })));
  }
}

export class SyncSingleFile implements SyncSingleFileUseCase {
  constructor(
    private readonly sync: SyncEntity,
    private readonly item: SyncItem,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute() {
    const sync = this.sync;
    const item = this.item;

    if (!sync.kb) {
      return of({ success: false });
    }
    const nucliaConnector = new NucliaCloud(sync.kb);
    return downloadFileOrLink(sync, item).pipe(
      switchMap((data) => {
        try {
          if (data.type === 'blob' && data.blob) {
            return from(data.blob.arrayBuffer()).pipe(
              switchMap((arrayBuffer) => {
                return nucliaConnector.upload(item.originalId, item.title, {
                  buffer: arrayBuffer,
                  metadata: { ...item.metadata, labels: sync.labels },
                  mimeType: item.mimeType,
                });
              }),
            );
          } else if (data.type === 'text' && data.text) {
            return nucliaConnector.upload(item.originalId, item.title, {
              text: data.text,
              metadata: { labels: sync.labels },
            });
          } else if (data.type === 'link' && data.link) {
            return nucliaConnector
              .uploadLink(item.originalId, item.title, data.link, { labels: sync.labels })
              .pipe(map(() => ({ success: true, message: '' })));
          } else {
            return of({ success: false, message: '' });
          }
        } catch (err) {
          return of({ success: false, message: `${err}` });
        }
      }),
      tap((res) => {
        if (res.success) {
          console.log(`Uploaded ${item.originalId} with success`);
          eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SINGLE_FILE, {
            from: sync.id,
            to: sync.kb?.knowledgeBox || 'Unknown kb',
            date: new Date().toISOString(),
            status: 'success',
            message: `Uploaded ${item.originalId} with success`,
          });
        } else {
          console.warn(`Failed to upload ${item.originalId}`);
          eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SINGLE_FILE, {
            from: sync.id,
            to: sync.kb?.knowledgeBox || 'Unknown kb',
            date: new Date().toISOString(),
            status: 'failed',
            message: `Failed to upload ${item.originalId} ${res.message || ''}`,
          });
        }
      }),
    );
  }
}
