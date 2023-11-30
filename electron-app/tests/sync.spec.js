import request from 'supertest';
import { describe, expect } from 'vitest';
import { serverTest } from './fixtures';

describe('Test Sync object', () => {
  serverTest('Add new sync - error - no connector', async ({ server }) => {
    const response = await request(server.app).post('/sync').send({});
    expect(response.body.error).toEqual('Connector definition is not defined');
    expect(response.status).toBe(400);
  });

  serverTest('Add new sync - error - connector not exists', async ({ server }) => {
    const response = await request(server.app)
      .post('/sync')
      .send({
        connector: {
          name: 'connector-not-exists',
        },
      });
    expect(response.body.error).toEqual('Connector definition is not defined');
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
    const responsePatch = await request(serverWithSync.app).patch(`/sync/${id}`).send({
      title: 'Sync1',
    });
    expect(responsePatch.status).toBe(204);

    const responseGet = await request(serverWithSync.app).get(`/sync/${id}`);
    expect(responseGet.status).toBe(200);
    expect(responseGet.body['title']).toBe('Sync1');
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
