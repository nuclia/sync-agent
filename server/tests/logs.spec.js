import request from 'supertest';
import { describe, expect, vi } from 'vitest';
import { serverTest } from './fixtures';

describe('Test Logs object', () => {
  serverTest('Get all logs', async ({ serverWithSync }) => {
    const data = await vi.waitFor(
      // This is because the logs are saved in background with an event.
      async () => {
        const response = await request(serverWithSync.app).get('/logs');
        expect(response.status).toBe(200);
        expect(response.body.length).toEqual(1);
        return response;
      },
      {
        timeout: 500, // default is 1000
        interval: 20, // default is 50
      },
    );

    expect(data.body[0].message).toEqual('Sync created');
    expect(Object.keys(data.body[0].payload).length).toBeGreaterThan(0);
  });

  serverTest('Delete logs', async ({ serverWithSync }) => {
    let response = await request(serverWithSync.app).delete('/logs');
    expect(response.status).toBe(200);

    response = await request(serverWithSync.app).get('/logs');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toEqual(0);
  });
});
