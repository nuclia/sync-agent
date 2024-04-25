/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextField } from '@nuclia/core';
import { Observable, catchError, from, map, of, switchMap, tap } from 'rxjs';

import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { SyncItem } from '../../../connector/domain/connector';
import { NucliaCloud } from '../nuclia-cloud';
import { ContentType, SyncEntity, TO_BE_CHECKED } from '../sync.entity';

require('localstorage-polyfill');

export interface SyncSingleFileUseCase {
  execute(): Observable<{ success: boolean; message?: string }>;
}

function downloadFileOrLink(
  sync: SyncEntity,
  item: SyncItem,
): Observable<{
  type: ContentType;
  blob?: Blob;
  link?: any;
  text?: TextField;
  extra?: { groups?: string[] };
}> {
  const connector = sync.sourceConnector;
  if (!connector) {
    throw new Error('No connector found');
  } else {
    if (connector?.isExternal) {
      return connector.getLink(item).pipe(map((link) => ({ type: ContentType.link, link })));
    } else {
      return connector.download(item).pipe(
        map((res) =>
          res instanceof Blob ? { type: ContentType.blob, blob: res } : { type: ContentType.text, text: res },
        ),
        switchMap((res) => {
          if (sync.syncSecurityGroups && connector.getGroups) {
            return connector.getGroups(item).pipe(
              map((groups) => {
                return { ...res, extra: { groups } };
              }),
            );
          } else {
            return of(res);
          }
        }),
      );
    }
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
    return this.uploadOrDelete(item, sync).pipe(
      tap((res) => {
        if (res.success) {
          const message =
            res.action === 'delete'
              ? `Deleted ${item.originalId} with success`
              : `Uploaded ${item.originalId} with success`;
          console.log(message);
          eventEmitter.emit(EVENTS.FINISH_SYNCHRONIZATION_SINGLE_FILE, {
            from: sync.id,
            to: sync.kb?.knowledgeBox || 'Unknown kb',
            date: new Date().toISOString(),
            status: 'success',
            message,
          });
        } else {
          console.warn(`Failed to ${res.action} ${item.originalId}`);
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

  private uploadOrDelete(
    item: SyncItem,
    sync: SyncEntity,
  ): Observable<{ success: boolean; message?: string; action: string }> {
    const nucliaConnector = new NucliaCloud(sync.kb);
    if (item.deleted) {
      return nucliaConnector.delete(item.originalId).pipe(
        map(() => ({ success: true, message: '', action: 'delete' })),
        catchError((err) => of({ success: false, message: `${err}`, action: 'delete' })),
      );
    } else {
      return downloadFileOrLink(sync, item).pipe(
        switchMap((data) => {
          try {
            if (data.type === ContentType.blob && data.blob) {
              return from(data.blob.arrayBuffer()).pipe(
                switchMap((arrayBuffer) => {
                  return nucliaConnector.upload(item.originalId, item.title, {
                    buffer: arrayBuffer,
                    metadata: {
                      ...item.metadata,
                      labels: sync.labels,
                      groups: data.extra?.groups,
                      sourceId: sync.id,
                    },
                    mimeType: item.mimeType,
                  });
                }),
                map((res) => ({ ...res, action: 'upload' })),
              );
            } else if (data.type === ContentType.text && data.text) {
              return nucliaConnector
                .upload(item.originalId, item.title, {
                  text: data.text,
                  metadata: { ...item.metadata, labels: sync.labels, groups: data.extra?.groups, sourceId: sync.id },
                })
                .pipe(map((res) => ({ ...res, action: 'upload' })));
            } else if (data.type === ContentType.link && data.link) {
              const mimeType =
                item.mimeType !== TO_BE_CHECKED ? of(item.mimeType || 'text/html') : this.checkMimetype(data.link.uri);
              return mimeType.pipe(
                switchMap((type) =>
                  nucliaConnector.uploadLink(
                    item.originalId,
                    item.title,
                    data.link,
                    type,
                    { ...item.metadata, labels: sync.labels, groups: data.extra?.groups, sourceId: sync.id },
                    {
                      headers: sync.connector.parameters.headers,
                      cookies: sync.connector.parameters.cookies,
                      localstorage: sync.connector.parameters.localstorage,
                    },
                  ),
                ),
                map(() => ({ success: true, message: '', action: 'upload' })),
              );
            } else {
              return of({ success: false, message: '', action: 'upload' });
            }
          } catch (err) {
            return of({ success: false, message: `${err}`, action: 'upload' });
          }
        }),
      );
    }
  }

  private checkMimetype(url: string): Observable<string> {
    try {
      return from(fetch(url, { method: 'HEAD' })).pipe(
        map((response) => (response.headers.get('content-type') || 'text/html').split(';')[0]),
        catchError(() => of('text/html')),
      );
    } catch (err) {
      return of('text/html');
    }
  }
}
