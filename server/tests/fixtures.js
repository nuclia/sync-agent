import request from 'supertest';
import { expect, test } from 'vitest';
import { deleteDirectory, pathExists } from '../src/fileSystemFn';
import { beforeStartServer } from '../src/fileSystemServerFn';
import { AppFileSystemRoutes } from '../src/presentation/routes';
import { Server } from '../src/server';
import { initFileSystemSubscribers } from '../src/subscribers';

function getUniquePath(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const serverTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  server: async ({}, use) => {
    const basePath = getUniquePath('.nuclia');
    const appRoutes = new AppFileSystemRoutes(basePath);
    const testServer = new Server({ port: 0, routes: appRoutes.getRoutes() });
    initFileSystemSubscribers(basePath);
    await beforeStartServer(basePath);
    await testServer.start();

    try {
      await use(testServer);
    } finally {
      await testServer.close();
      if (await pathExists(basePath)) {
        await deleteDirectory(basePath);
      }
    }
  },
  serverWithSync: async ({ server }, use) => {
    let response = await request(server.app)
      .post('/sync')
      .send({
        connector: {
          name: 'folder',
          logo: '',
          parameters: {
            path: 'test',
          },
        },
        kb: {
          knowledgeBox: 'test',
          backend: 'http://localhost:8000',
          apiKey: 'apiKey',
        },
      });
    expect(response.status).toBe(201);
    await use(server);
  },
  serverWithOAuthSync: async ({ server }, use) => {
    let response = await request(server.app)
      .post('/sync')
      .send({
        id: 'sync_oauth_gdrive',
        connector: {
          name: 'gdrive',
          logo: '',
          parameters: {
            token: 'token_test',
            refresh: 'refresh_token_test',
          },
        },
        kb: {
          knowledgeBox: 'test',
          backend: 'http://localhost:8000',
          apiKey: 'apiKey',
        },
      });
    expect(response.status).toBe(201);
    await use(server);
  },
  serverWithSyncWithoutConnector: async ({ server }, use) => {
    let response = await request(server.app)
      .post('/sync')
      .send({
        id: 'sync_without_connector',
        title: 'Sync without connector',
        connector: {
          name: 'gdrive',
        },
        kb: {
          knowledgeBox: 'test',
          backend: 'http://localhost:8000',
          apiKey: 'apiKey',
        },
      });
    expect(response.status).toBe(201);
    await use(server);
  },
});

export const serverTestWithoutFolder = test.extend({
  // eslint-disable-next-line no-empty-pattern
  server: async ({}, use) => {
    const basePath = getUniquePath('.nuclia_not');
    const appRoutes = new AppFileSystemRoutes(basePath);
    const testServer = new Server({ port: 0, routes: appRoutes.getRoutes() });
    initFileSystemSubscribers(basePath);
    await testServer.start();
    try {
      await use(testServer);
    } finally {
      await testServer.close();
      if (await pathExists(basePath)) {
        await deleteDirectory(basePath);
      }
    }
  },
});
