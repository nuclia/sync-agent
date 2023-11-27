import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { deleteDirectory } from '../src/fileSystemFn';
import { beforeStartServer } from '../src/fileSystemServerFn';
import { AppFileSystemRoutes } from '../src/presentation/routes';
import { Server } from '../src/server';
import { initFileSystemSubscribers } from '../src/subscribers';

const appRoutes = new AppFileSystemRoutes('.nuclia');
const testServer = new Server({ port: 8000, routes: appRoutes.getRoutes() });
initFileSystemSubscribers('.nuclia');

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

  test('Get sync without folder server', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(404);
  });

  test('Add new sync', async () => {
    const response = await request(testServer.app).post('/sync').send({});
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

  test('Get sync - empty folder', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Get empty logs', async () => {
    const response = await request(testServer.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Add new sync', async () => {
    const response = await request(testServer.app).post('/sync').send({});
    expect(response.status).toBe(201);
  });

  test('Get all sync', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);
  });

  test('Get logs with sync created', async () => {
    const response = await request(testServer.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);
  });

  test('Update a sync', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responsePatch = await request(testServer.app).patch(`/sync/${id}`).send({
      title: 'Sync1',
    });
    expect(responsePatch.status).toBe(204);
  });

  test('Get a updated sync', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responseGet = await request(testServer.app).get(`/sync/${id}`);
    expect(responseGet.status).toBe(200);
    expect(responseGet.body['title']).toBe('Sync1');
  });

  test('Delete a sync', async () => {
    let response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(1);

    const id = Object.keys(response.body)[0];
    const responseDelete = await request(testServer.app).delete(`/sync/${id}`);
    expect(responseDelete.status).toBe(200);

    response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Get connectors', async () => {
    const response = await request(testServer.app).get('/sync');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  test('Get all logs', async () => {
    const response = await request(testServer.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(3);
  });

  test('Delete logs', async () => {
    let response = await request(testServer.app).delete('/logs');
    expect(response.status).toBe(200);

    response = await request(testServer.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });
});
