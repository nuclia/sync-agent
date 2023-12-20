import { describe, expect, test } from 'vitest';
import { UpdateSyncDto } from '../update-sync.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props: any = {
  id: 'test',
};
describe('Update Sync dto tests', () => {
  test('should update a valid dto', () => {
    let [error, dto] = UpdateSyncDto.create(props);
    expect(error).toBeUndefined();
    expect(dto).toBeDefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      connector: undefined,
      kb: undefined,
      foldersToSync: undefined,
    });
    expect(error).toBeUndefined();
    expect(dto).toBeDefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      foldersToSync: [],
      kb: {
        backend: 'backend',
      },
    });
    expect(error).toBeUndefined();
    expect(dto).toBeDefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      kb: {
        backend: 'backend',
      },
      foldersToSync: [{ title: 'folder1', metadata: {}, status: 'PENDING', originalId: 'id' }],
    });
    expect(error).toBeUndefined();
    expect(dto).toBeDefined();
  });

  test('should not update a valid dto - id is mandatory', () => {
    const [error, dto] = UpdateSyncDto.create({
      ...props,
      id: undefined,
    });
    expect(error).toEqual('id is mandatory');
    expect(dto).toBeUndefined();
  });

  test('should not update a valid dto - connector mandatory', () => {
    const [error, dto] = UpdateSyncDto.create({
      ...props,
      connector: {},
    });
    expect(error).toEqual('Connector definition is not defined');
    expect(dto).toBeUndefined();
  });

  test('should not update a valid dto - connector params error', () => {
    const [error, dto] = UpdateSyncDto.create({
      ...props,
      connector: {
        name: 'folder',
      },
    });
    expect(error).toEqual('Connector folder parameters are not valid');
    expect(dto).toBeUndefined();
  });

  test('should not create a valid dto - kb params are not valid', () => {
    let [error, dto] = UpdateSyncDto.create({
      ...props,
      kb: {
        knowledgeBox: '',
      },
    });
    expect(error).toEqual('Invalid format for kb: Error: knowledgeBox is required');
    expect(dto).toBeUndefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      kb: {
        apiKey: '',
      },
    });
    expect(error).toEqual('Invalid format for kb: Error: apiKey is required');
    expect(dto).toBeUndefined();
  });

  test('should not update a valid dto - folders to sync params error', () => {
    let [error, dto] = UpdateSyncDto.create({
      ...props,
      foldersToSync: [{}],
    });
    expect(error).toEqual(
      'Invalid format for foldersToSync: Error: title: Required, originalId: Required, metadata: Required, status: Required',
    );
    expect(dto).toBeUndefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      foldersToSync: [{ title: 'folder1' }],
    });
    expect(error).toEqual(
      'Invalid format for foldersToSync: Error: originalId: Required, metadata: Required, status: Required',
    );
    expect(dto).toBeUndefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      foldersToSync: [{ title: 'folder1', metadata: 'metadata' }],
    });
    expect(error).toEqual(
      'Invalid format for foldersToSync: Error: originalId: Required, metadata: Expected object, received string, status: Required',
    );
    expect(dto).toBeUndefined();

    [error, dto] = UpdateSyncDto.create({
      ...props,
      foldersToSync: [{ title: 'folder1', metadata: {}, status: '' }],
    });
    expect(error).toEqual(
      // eslint-disable-next-line quotes
      "Invalid format for foldersToSync: Error: originalId: Required, status: Invalid enum value. Expected 'PENDING' | 'PROCESSING' | 'UPLOADED', received ''",
    );
    expect(dto).toBeUndefined();
  });
});
