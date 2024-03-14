import request from 'supertest';
import { expect, test } from 'vitest';
import { deleteDirectory } from '../src/fileSystemFn';
import { beforeStartServer } from '../src/fileSystemServerFn';
import { AppFileSystemRoutes } from '../src/presentation/routes';
import { Server } from '../src/server';
import { initFileSystemSubscribers } from '../src/subscribers';

export const serverTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  server: async ({}, use) => {
    const appRoutes = new AppFileSystemRoutes('.nuclia');
    const testServer = new Server({ port: 8000, routes: appRoutes.getRoutes() });
    initFileSystemSubscribers('.nuclia');
    await beforeStartServer('.nuclia');
    await testServer.start();

    await use(testServer);

    await deleteDirectory('.nuclia');
    await testServer.close();
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
    const appRoutes = new AppFileSystemRoutes('.nuclia_not');
    const testServer = new Server({ port: 8002, routes: appRoutes.getRoutes() });
    initFileSystemSubscribers('.nuclia_not');
    await testServer.start();
    await use(testServer);
    await testServer.close();
  },
});
