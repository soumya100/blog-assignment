const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('VAPT Security & Injection Tests', () => {
  test('NoSQL Injection: Sanitizes $gt operators from request body', async () => {
    // Malicious payload attempting to bypass authentication via Mongo operators
    const payload = {
      email: { $gt: '' },
      password: { $gt: '' },
    };

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(payload);

    // Should fail validation because operator was stripped or rejected, NOT crash or authenticate
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Security Headers: Helmet sets appropriate defensive headers', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  test('Malformed JSON Handling: Returns clean 400 without stack trace leakage', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "test@test.com", "password": invalid_json_here}');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_JSON');
    // Ensure no stack traces or server internals leaked
    expect(res.body.stack).toBeUndefined();
  });

  test('Broken Authentication: Rejects forged signature on JWT', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJyb2xlIjoiQURNSU4ifQ.FAKESIGNATURE_1234567890';

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('CORS Policy: Blocks requests from unauthorized origins', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://malicious-attacker-domain.evil.com');

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('CORS_ERROR');
  });
});
