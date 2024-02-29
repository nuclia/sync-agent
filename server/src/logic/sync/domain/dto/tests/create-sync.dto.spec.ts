import { describe, expect, test } from 'vitest';
import { CreateSyncDto } from '../create-sync.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props: any = {
  id: 'id',
  connector: {
    name: 'folder',
    logo: '',
    parameters: {
      path: '/path',
    },
  },
  kb: {
    knowledgeBox: 'knowledgeBox',
    zone: 'zone',
    backend: 'backend',
    apiKey: 'apiKey',
  },
  labels: ['label'],
  title: 'title',
};

describe('Create Sync dto tests', () => {
  test('should create a valid dto', () => {
    const [error, dto] = CreateSyncDto.create({ ...props, id: undefined });

    expect(error).toBeUndefined();
    expect(dto).toBeDefined();
  });

  test('should not create a valid dto - connector definition', () => {
    const [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      connector: {
        name: 'invalid',
      },
    });

    expect(error).toEqual('Connector definition is not defined');
    expect(dto).toBeUndefined();
  });

  test('should not create a valid dto - connector params are incomplete', () => {
    const [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      connector: {
        name: 'folder',
        params: {},
      },
    });

    expect(error).toBeUndefined();
    expect(dto).toBeDefined();
  });

  test('should not create a valid dto - kb params are not valid', () => {
    let [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      kb: undefined,
    });

    expect(error).toEqual('The Knowledge Box info is mandatory');
    expect(dto).toBeUndefined();

    [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      kb: {
        knowledgeBox: '',
      },
    });

    expect(error).toEqual('Invalid format for kb: Error: backend: Required, knowledgeBox: Required');
    expect(dto).toBeUndefined();

    [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      kb: {
        knowledgeBox: 'knowledgeBox',
      },
    });

    expect(error).toEqual('Invalid format for kb: Error: backend: Required');
    expect(dto).toBeUndefined();

    [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      kb: {
        knowledgeBox: 'knowledgeBox',
        zone: '',
      },
    });

    expect(error).toEqual('Invalid format for kb: Error: backend: Required');
    expect(dto).toBeUndefined();

    [error, dto] = CreateSyncDto.create({
      ...props,
      id: undefined,
      kb: {
        knowledgeBox: 'knowledgeBox',
        zone: 'zone',
      },
    });

    expect(error).toEqual('Invalid format for kb: Error: backend: Required');
    expect(dto).toBeUndefined();
  });
});
