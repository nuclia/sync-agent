/* eslint-disable @typescript-eslint/no-explicit-any */

import { lookup } from 'mime-types';
import { createHash } from 'node:crypto';
import { catchError, delay, map, Observable, of, retry, switchMap, timer } from 'rxjs';

import {
  FIELD_TYPE,
  ICreateResource,
  INuclia,
  Nuclia,
  NucliaOptions,
  Resource,
  TextField,
  UploadResponse,
  WritableKnowledgeBox,
} from '@nuclia/core';
import { Link } from '../../connector/domain/connector';

function sha256(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

const retryDelays = [1000, 5000, 20000];
const RETRY_CONFIG = {
  count: 3,
  delay: (error: unknown, retryCount: number) => {
    // failing operator will be retried once this delay function emits,
    // retryDelays is an array containing the delay to wait before retrying
    return timer(retryDelays[retryCount <= retryDelays.length ? retryCount - 1 : retryDelays.length - 1]);
  },
};

export class NucliaCloud {
  nuclia: INuclia;
  private kb?: WritableKnowledgeBox;

  constructor(options: NucliaOptions) {
    this.nuclia = new Nuclia(options);
  }

  upload(
    originalId: string,
    filename: string,
    data: { buffer?: ArrayBuffer; text?: TextField; metadata?: any; mimeType?: string },
  ): Observable<{ success: boolean; message?: string }> {
    const slug = sha256(originalId);
    const text = data.text;
    const buffer = data.buffer;
    if (buffer || text) {
      return this.getKb().pipe(
        switchMap((kb) =>
          kb.getResourceBySlug(slug, [], []).pipe(
            switchMap((resource) => {
              if (data.metadata?.labels) {
                return resource
                  .modify({ usermetadata: { classifications: data.metadata.labels } })
                  .pipe(map(() => resource));
              } else {
                return of(resource);
              }
            }),
            catchError((error) => {
              if (error.status === 404) {
                const resourceData: ICreateResource = { slug, title: filename };
                if (data.metadata.labels) {
                  resourceData.usermetadata = { classifications: data.metadata?.labels };
                }
                if (data.metadata.path) {
                  let path = data.metadata.path;
                  if (path && !path.startsWith('/')) {
                    path = `/${path}`;
                  }
                  resourceData.origin = { path };
                }
                return kb.createResource(resourceData, true).pipe(
                  retry(RETRY_CONFIG),
                  map((data) => kb.getResourceFromData({ id: data.uuid })),
                );
              } else {
                console.error(`Problem creating ${slug}, status ${error.status}`);
                return of(undefined);
              }
            }),
          ),
        ),
        catchError(() => of(undefined)),
        delay(500),
        switchMap((resource) => {
          if (!resource) {
            return of({ success: false });
          }
          if (buffer) {
            try {
              return resource
                .upload('file', buffer, false, {
                  contentType: data.mimeType || lookup(filename) || 'application/octet-stream',
                  filename,
                })
                .pipe(
                  catchError((error: any) => {
                    console.error(`Problem uploading ${filename} to ${slug}, error: ${JSON.stringify(error)}`);
                    return of({ success: false, message: error.body?.detail || JSON.stringify(error) });
                  }),
                  switchMap((res) => {
                    if (res && (res as UploadResponse).completed) {
                      return of({ success: true });
                    } else {
                      return this.deleteResource(slug, resource).pipe(
                        map(() =>
                          (res as any).success === false
                            ? (res as { success: boolean; message: string })
                            : { success: false, message: 'Upload failed' },
                        ),
                      );
                    }
                  }),
                );
            } catch (error) {
              console.error(`Error uploading ${filename} to ${slug}, status ${error}`);
              return this.deleteResource(slug, resource).pipe(map(() => ({ success: false })));
            }
          } else if (text) {
            try {
              return resource.setField(FIELD_TYPE.text, 'text', text).pipe(
                catchError((error: any) => {
                  console.error(`Problem adding ${filename} to ${slug}, status ${error}`);
                  return of({ success: false });
                }),
                switchMap((res) => {
                  if (res) {
                    return of({ success: true });
                  } else {
                    return this.deleteResource(slug, resource).pipe(map(() => ({ success: false })));
                  }
                }),
              );
            } catch (error) {
              console.error(`Error adding ${filename} to ${slug}, status ${error}`);
              return this.deleteResource(slug, resource).pipe(map(() => ({ success: false })));
            }
          } else {
            return of({ success: false });
          }
        }),
      );
    } else {
      return of({ success: false });
    }
  }

  private deleteResource(slug: string, resource: Resource): Observable<false> {
    try {
      return resource.delete().pipe(map(() => false));
    } catch (error) {
      console.error(`Problem deleting ${slug}, status ${error}`);
      return of(false);
    }
  }

  uploadLink(originalId: string, filename: string, data: Link, metadata?: any): Observable<void> {
    const slug = sha256(originalId);
    const payload: ICreateResource = {
      title: filename,
      slug,
      links: { link: { uri: data.uri } },
      origin: { url: data.uri },
      icon: 'application/stf-link',
    };
    if (metadata.labels) {
      payload.usermetadata = { classifications: metadata.labels };
    }
    return this.getKb().pipe(
      switchMap((kb) =>
        kb.createOrUpdateResource(payload).pipe(
          retry(RETRY_CONFIG),
          delay(500), // do not overload the server
          catchError((error) => {
            console.log('createOrUpdateResource – error:', JSON.stringify(error));
            return of({ success: false, message: '' });
          }),
        ),
      ),
      map(() => undefined),
    );
  }

  private getKb(): Observable<WritableKnowledgeBox> {
    if (this.kb) {
      return of(this.kb);
    } else {
      return this.nuclia.db.getKnowledgeBox().pipe(
        map((kb) => {
          this.kb = kb;
          return kb;
        }),
      );
    }
  }
}
