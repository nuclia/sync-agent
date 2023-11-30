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
    let response = await request(serverWithSync.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);
  });

  serverTest('Update a sync', async ({ serverWithSync }) => {
    const response = await request(serverWithSync.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responsePatch = await request(serverWithSync.app)
      .patch(`/sync/${id}`)
      .send({
        title: 'Sync1',
        kb: {
          backend: 'http://localhost:9000',
        },
      });
    expect(responsePatch.status).toBe(204);

    const responseGet = await request(serverWithSync.app).get(`/sync/${id}`);
    expect(responseGet.status).toBe(200);
    expect(responseGet.body['title']).toBe('Sync1');
    expect(responseGet.body['kb']).toEqual({
      knowledgeBox: 'test',
      zone: 'local',
      backend: 'http://localhost:9000',
      apiKey: 'apiKey',
    });
  });

  serverTest('Delete a sync', async ({ serverWithSync }) => {
    let response = await request(serverWithSync.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responseDelete = await request(serverWithSync.app).delete(`/sync/${id}`);
    expect(responseDelete.status).toBe(200);

    response = await request(serverWithSync.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });
});
