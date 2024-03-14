import request from 'supertest';
import { describe, expect } from 'vitest';
import { serverTest } from './fixtures';

const connectorData = {
  name: 'folder',
  logo: '',
  parameters: {
    path: 'test',
  },
};

describe('Test Sync object', () => {
  serverTest('Add new sync - error - validate connector', async ({ server }) => {
    let response = await request(server.app).post('/sync').send({});
    expect(response.body.error).toEqual('Connector definition is not defined');
    expect(response.status).toBe(400);

    response = await request(server.app)
      .post('/sync')
      .send({
        connector: {
          name: 'connector-not-exists',
        },
      });
    expect(response.body.error).toEqual('Connector definition is not defined');
    expect(response.status).toBe(400);
  });

  serverTest('Add new sync - error - validate knowledge box', async ({ server }) => {
    let response = await request(server.app).post('/sync').send({
      connector: connectorData,
    });
    expect(response.body.error).toEqual('The Knowledge Box info is mandatory');
    expect(response.status).toBe(400);
  });

  serverTest('Add new sync', async ({ serverWithSync }) => {
    let response = await request(serverWithSync.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(1);
  });

  serverTest('Update a sync', async ({ serverWithSync }) => {
    const response = await request(serverWithSync.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(1);

    const id = response.body[0].id;
    const responsePatch = await request(serverWithSync.app)
      .patch(`/sync/${id}`)
      .set('token', 'fake-token')
      .send({
        title: 'Sync1',
        kb: {
          backend: 'http://localhost:9000',
        },
      });
    expect(responsePatch.status).toBe(204);

    const responseGet = await request(serverWithSync.app).get(`/sync/${id}`).set('token', 'fake-token');
    expect(responseGet.status).toBe(200);
    expect(responseGet.body['title']).toBe('Sync1');
    expect(responseGet.body['kb']).toEqual({
      knowledgeBox: 'test',
      backend: 'http://localhost:9000',
      apiKey: 'apiKey',
    });
  });

  serverTest('Get entity auth', async ({ serverWithOAuthSync }) => {
    const responseAuth = await request(serverWithOAuthSync.app).get('/sync/sync_oauth_gdrive/auth');
    expect(responseAuth.status).toBe(200);
    expect(responseAuth.body.hasAuth).toBe(true);
  });

  serverTest('Get entity auth', async ({ serverWithSyncWithoutConnector }) => {
    const responseAuth = await request(serverWithSyncWithoutConnector.app).get('/sync/sync_without_connector/auth');
    expect(responseAuth.status).toBe(200);
    expect(responseAuth.body.hasAuth).toBe(false);
  });

  serverTest('Delete a sync', async ({ serverWithSync }) => {
    let response = await request(serverWithSync.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(3);

    const id = response.body[0].id;
    const responseDelete = await request(serverWithSync.app).delete(`/sync/${id}`).set('token', 'fake-token');
    expect(responseDelete.status).toBe(200);

    response = await request(serverWithSync.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(2);
  });
});
