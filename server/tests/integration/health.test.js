const request = require('supertest');
const app = require('../../src/app');

describe('API health smoke test', () => {
  test('reports the API as healthy through the versioned route', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('UP');
    expect(response.body.data.timestamp).toBeTruthy();
    expect(response.body.data.uptime).toEqual(expect.any(Number));
  });

  test('keeps the compatibility health route available', async () => {
    const response = await request(app).get('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('UP');
  });
});
