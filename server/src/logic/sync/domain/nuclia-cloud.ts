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
import { LinkExtraParams } from './sync.entity';

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
    const resourceData: Partial<ICreateResource> = { title: filename, ...this.setMetadata(data, data.metadata) };
    if (buffer || text) {
      return this.getKb().pipe(
        switchMap((kb) =>
          kb.getResourceBySlug(slug, [], []).pipe(
            switchMap((resource) => resource.modify(resourceData).pipe(map(() => resource))),
            catchError((error) => {
              if (error.status === 404) {
                resourceData.slug = slug;
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

  uploadLink(
    originalId: string,
    filename: string,
    data: Link,
    mimeType: string,
    metadata?: any,
    linkExtraParams?: LinkExtraParams,
  ): Observable<void> {
    const slug = sha256(originalId);
    let payload: ICreateResource = {
      slug,
      origin: { url: data.uri },
    };
    if (!mimeType.startsWith('text/html')) {
      payload.title = filename;
      payload.files = {
        file: { file: { uri: data.uri, filename: filename, extra_headers: this.listToDict(linkExtraParams?.headers) } },
      };
      payload.icon = mimeType;
    } else {
      payload.links = {
        link: {
          uri: data.uri,
          css_selector: data.cssSelector || undefined,
          xpath: data.xpathSelector || undefined,
          headers: this.listToDict(linkExtraParams?.headers),
          cookies: this.listToDict(linkExtraParams?.cookies),
          localstorage: this.listToDict(linkExtraParams?.localstorage),
        },
      };
      payload.icon = 'application/stf-link';
    }
    payload = this.setMetadata(payload, metadata);

    return this.getKb().pipe(
      switchMap((kb) =>
        kb.hasResource(slug).pipe(
          switchMap((exists) => {
            if (exists) {
              delete payload.title;
            }
            return kb.createOrUpdateResource(payload);
          }),
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

  delete(originalId: string): Observable<void> {
    const slug = sha256(originalId);
    return this.getKb().pipe(switchMap((kb) => kb.getResourceFromData({ id: '', slug }).delete()));
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

  private listToDict(list: { key: string; value: string }[] | undefined): { [key: string]: string } {
    return (list || [])
      .filter((item) => item.key && item.value)
      .reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as { [key: string]: string });
  }

  private setMetadata(resource: Partial<ICreateResource>, metadata: any): Partial<ICreateResource> {
    if (metadata.labels) {
      resource.usermetadata = { classifications: metadata?.labels };
    }
    if (metadata.path) {
      let path = metadata.path;
      if (path && !path.startsWith('/')) {
        path = `/${path}`;
      }
      resource.origin = { ...(resource.origin || {}), path };
    }
    if (metadata?.groups) {
      resource.security = { access_groups: metadata.groups };
    }
    if (metadata?.sourceId) {
      resource.origin = { ...(resource.origin || {}), source_id: metadata.sourceId };
    }
    return resource;
  }
}
