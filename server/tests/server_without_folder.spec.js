import request from 'supertest';
import { describe, expect } from 'vitest';
import { serverTestWithoutFolder } from './fixtures';

describe('Server without folder', () => {
  serverTestWithoutFolder('Init server', async ({ server }) => {
    const response = await request(server.app).get('/');
    expect(response.status).toBe(200);
  });

  serverTestWithoutFolder('Get sync without folder server', async ({ server }) => {
    const response = await request(server.app).get('/sync');
    expect(response.status).toBe(404);
  });

  serverTestWithoutFolder('Add new sync', async ({ server }) => {
    const response = await request(server.app).post('/sync').send({});
    expect(response.status).toBe(404);
  });
});
