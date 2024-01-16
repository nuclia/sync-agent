import { firstValueFrom, of } from 'rxjs';
import { describe, expect, test, vi } from 'vitest';
import { FileStatus } from '../../../domain/connector';
import { DropboxImpl } from '../dropbox.connector';

const data = [
  {
    uuid: '1v8WV_aNM5qB_642saVlPhOkN1xI0NtQo',
    title: 'PO6300590983',
    originalId: '1v8WV_aNM5qB_642saVlPhOkN1xI0NtQo',
    modifiedGMT: '2023-11-29T12:49:27.539Z',
    metadata: {},
    status: 'PENDING',
  },
  {
    uuid: '19QJOCaOY4R8EQZ7VDrmmu2FBkeOlRAxJ',
    title: 'PO6300604892',
    originalId: '19QJOCaOY4R8EQZ7VDrmmu2FBkeOlRAxJ',
    modifiedGMT: '2023-11-27T12:48:06.061Z',
    metadata: {},
    status: 'PENDING',
  },
  {
    uuid: '1-5mIXJuiLTFxTO4mmVdXGNdf-Da-EzgA',
    title: 'PO4550970006',
    originalId: '1-5mIXJuiLTFxTO4mmVdXGNdf-Da-EzgA',
    modifiedGMT: '2023-11-27T12:46:08.712Z',
    metadata: {},
    status: 'PENDING',
  },
];

const dropboxTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  sourceConnector: async ({}, use) => {
    const mock = vi.spyOn(DropboxImpl.prototype, '_getFiles').mockImplementation(() => {
      return of({
        items: data,
        nextPage: null,
      });
    });
    await use(new DropboxImpl());
    mock.mockRestore();
  },
});

describe('Test validate dropbox params', () => {
  dropboxTest('Incorrect - Without params', ({ sourceConnector }) => {
    expect(sourceConnector.areParametersValid({})).toBe(false);
  });

  dropboxTest('Incorrect - With wrong params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
      }),
    ).toBe(false);
  });

  dropboxTest('Incorrect - With wrong params - one valid', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
        token: 'test',
      }),
    ).toBe(false);
  });

  dropboxTest('Incorrect - With wrong params - one valid', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        incorrect: 'test',
        refresh: 'test',
      }),
    ).toBe(false);
  });

  dropboxTest('Incorrect - With wrong params - two valid', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        token: 'test',
        refresh: 'test',
      }),
    ).toBe(false);
  });

  dropboxTest('Incorrect - With wrong params - invalid url', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        token: 'test',
        refresh: 'test',
        refresh_endpoint: 'invalid_url',
      }),
    ).toBe(false);
  });

  dropboxTest('Incorrect - With empty params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        token: '',
        refresh: '',
        refresh_endpoint: '',
      }),
    ).toBe(false);
  });

  dropboxTest('Correct - With correct params', ({ sourceConnector }) => {
    expect(
      sourceConnector.areParametersValid({
        token: 'test',
        refresh: 'test',
        refresh_endpoint: 'https://stashify.cloud/api/external_auth/gdrive/refresh',
      }),
    ).toBe(true);
  });
});

describe('Test last modified', () => {
  dropboxTest('Get last modified', async ({ sourceConnector }) => {
    const lastModified = await firstValueFrom(
      sourceConnector.getLastModified('2023-11-28T00:00:00.000Z', [
        {
          uuid: 'test_uuid',
          title: 'Test folder',
          originalId: 'test_uuid',
          metadata: {},
          status: FileStatus.PENDING,
        },
      ]),
    );

    expect(lastModified).toEqual({
      items: [
        {
          uuid: '1v8WV_aNM5qB_642saVlPhOkN1xI0NtQo',
          title: 'PO6300590983',
          originalId: '1v8WV_aNM5qB_642saVlPhOkN1xI0NtQo',
          modifiedGMT: '2023-11-29T12:49:27.539Z',
          metadata: {},
          status: FileStatus.PENDING,
        },
      ],
    });
  });
});
