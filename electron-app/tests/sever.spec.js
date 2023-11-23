import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { deleteDirectory } from '../src/fileSystemFn';
import { beforeStartServer } from '../src/fileSystemServerFn';
import { AppFileSystemRoutes } from '../src/presentation/routes';
import { Server } from '../src/server';

const appRoutes = new AppFileSystemRoutes('.nuclia');
const testServer = new Server({ port: 8000, routes: appRoutes.getRoutes() });

describe('Server without folder', () => {
  beforeAll(async () => {
    await testServer.start();
  });
  afterAll(async () => {
    await testServer.close();
  });

  test('Init server', async () => {
    const response = await request(testServer.app).get('/');
    expect(response.status).toBe(200);
  });

  test('Get sources without folder server', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(404);
  });

  test('Add new source', async () => {
    const response = await request(testServer.app).post('/sources').send({});
    expect(response.status).toBe(404);
  });
});

describe('Server width folder', () => {
  beforeAll(async () => {
    await beforeStartServer('.nuclia');
    await testServer.start();
  });
  afterAll(async () => {
    await deleteDirectory('.nuclia');
    await testServer.close();
  });

  test('Init server', async () => {
    const response = await request(testServer.app).get('/');
    expect(response.status).toBe(200);
  });

  test('Get sources - empty folder', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Add new source', async () => {
    const response = await request(testServer.app).post('/sources').send({});
    expect(response.status).toBe(201);
  });

  test('Get all sources', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);
  });

  test('Update a source', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responsePatch = await request(testServer.app).patch(`/sources/${id}`).send({
      name: 'Source1',
    });
    expect(responsePatch.status).toBe(204);
  });

  test('Get a updated source', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responseGet = await request(testServer.app).get(`/sources/${id}`);
    expect(responseGet.status).toBe(200);
    expect(responseGet.body['name']).toBe('Source1');
  });

  test('Delete a source', async () => {
    let response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responseDelete = await request(testServer.app).delete(`/sources/${id}`);
    expect(responseDelete.status).toBe(200);

    response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Get connectors', async () => {
    const response = await request(testServer.app).get('/sources');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });
});
