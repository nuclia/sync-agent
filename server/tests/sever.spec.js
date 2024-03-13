import request from 'supertest';
import { describe, expect } from 'vitest';
import { serverTest } from './fixtures';

describe('Basic server', () => {
  serverTest('Get all logs', async ({ server }) => {
    const response = await request(server.app).get('/');
    expect(response.status).toBe(200);
  });

  serverTest('Get sync - empty folder', async ({ server }) => {
    const response = await request(server.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(0);
  });

  serverTest('Get empty logs', async ({ server }) => {
    const response = await request(server.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });

  serverTest('Get connectors', async ({ server }) => {
    const response = await request(server.app).get('/sync/kb/test');
    expect(response.status).toBe(200);
    expect(response.body.length).toEqual(0);
  });
});
