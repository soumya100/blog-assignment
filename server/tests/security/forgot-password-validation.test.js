const express = require('express');
const request = require('supertest');
const authRoutes = require('../../src/routes/authRoutes');

describe('POST /auth/forgot-password validation', () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);

  it.each([
    ['missing email', {}],
    ['invalid email', { email: 'nope' }],
    ['non-string email', { email: { $gt: '' } }],
    ['array email', { email: ['reader@example.com'] }],
  ])('returns 400 for %s', async (_description, body) => {
    const response = await request(app)
      .post('/auth/forgot-password')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
    });
  });
});
