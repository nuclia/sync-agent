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
  UserClassification,
  UserMetadata,
  WritableKnowledgeBox,
} from '@nuclia/core';
import { Link } from '../../connector/domain/connector';
import { LinkExtraParams } from './sync.entity';
import { Readable } from 'node:stream';

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

export const deDuplicateLabels = (labels: UserClassification[]): UserClassification[] => {
  return labels.reduce((acc, curr) => {
    if (!acc.some((label) => label.labelset === curr.labelset && label.label === curr.label)) {
      acc.push(curr);
    }
    return acc;
  }, [] as UserClassification[]);
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
    data: {
      buffer?: ArrayBuffer;
      text?: TextField;
      metadata?: any;
      mimeType?: string;
      extract_strategy?: string;
      preserveLabels?: boolean;
    },
  ): Observable<{ success: boolean; message?: string }> {
    const slug = sha256(originalId);
    const text = data.text;
    const buffer = data.buffer;
    const resourceData: Partial<ICreateResource> = { title: filename, ...this.setMetadata(data, data.metadata) };
    if (buffer || text) {
      return this.getKb().pipe(
        switchMap((kb) =>
          kb.getResourceBySlug(slug, [], []).pipe(
            switchMap((resource) =>
              resource
                .modify({
                  ...resourceData,
                  usermetadata: data.preserveLabels
                    ? this.mergeLabels(resourceData, resource)
                    : { ...resourceData.usermetadata },
                })
                .pipe(map(() => resource)),
            ),
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
              return this.getMD5(buffer).pipe(
                switchMap((md5) =>
                  resource.upload('file', buffer, false, {
                    contentType: data.mimeType || lookup(filename) || 'application/octet-stream',
                    filename,
                    processing: data.extract_strategy,
                    md5,
                  }),
                ),
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
  ): Observable<{ success: boolean; message: string }> {
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
          extract_strategy: data.extract_strategy,
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
              return kb.getResourceBySlug(slug).pipe(
                switchMap((resource) =>
                  resource
                    .modify({
                      ...payload,
                      usermetadata: data.preserveLabels
                        ? this.mergeLabels(payload, resource)
                        : { ...payload.usermetadata },
                    })
                    .pipe(map(() => ({ success: true, message: '' }))),
                ),
              );
            } else {
              return kb.createOrUpdateResource(payload).pipe(map(() => ({ success: true, message: '' })));
            }
          }),
          retry(RETRY_CONFIG),
          delay(500), // do not overload the server
          catchError((error) => {
            console.log('createOrUpdateResource – error:', JSON.stringify(error));
            return of({ success: false, message: '' });
          }),
        ),
      ),
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

  private mergeLabels(resourceData: Partial<ICreateResource>, resource: Resource): UserMetadata {
    return {
      ...resourceData.usermetadata,
      classifications: deDuplicateLabels([
        ...(resource.usermetadata?.classifications || []),
        ...(resourceData.usermetadata?.classifications || []),
      ]),
    };
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
      resource.origin = { ...resource.origin, path };
    }
    if (metadata?.groups) {
      resource.security = { access_groups: metadata.groups };
    }
    if (metadata?.sourceId) {
      resource.origin = { ...resource.origin, source_id: metadata.sourceId };
    }
    if (metadata?.lastModified) {
      resource.origin = { ...resource.origin, modified: metadata.lastModified };
    }
    if (metadata?.uri && !resource.origin?.url) {
      resource.origin = { ...resource.origin, url: metadata.uri };
    }
    return resource;
  }

  private getMD5(buffer: ArrayBuffer): Observable<string> {
    return new Observable((observer) => {
      const output = createHash('md5');
      const readable = new Readable();
      readable._read = () => {}; // _read is required but you can noop it
      readable.push(Buffer.from(buffer));
      readable.push(null);
      readable.on('error', (err) => {
        console.error(err);
        observer.error(err);
      });
      output.once('readable', () => {
        observer.next(output.read().toString('hex'));
        observer.complete();
      });
      readable.pipe(output);
    });
  }
}
