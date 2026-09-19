const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const RefreshToken = require('../../src/models/RefreshToken');

describe('Authentication Integration Tests', () => {
  const validUser = {
    username: 'integration_user',
    email: 'integration@test.com',
    password: 'SecurePassword123!',
  };

  test('POST /api/v1/auth/register - registers user and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.accessToken).toBeDefined();

    // Check HttpOnly cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/refreshToken=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  test('POST /api/v1/auth/register - rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const duplicateRes = await request(app)
      .post('/api/v1/auth/register')
      .send(validUser);

    expect(duplicateRes.statusCode).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login - succeeds with correct credentials and returns tokens', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test('POST /api/v1/auth/login - rejects invalid credentials without enumeration', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: validUser.email,
        password: 'WrongPassword999!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('POST /api/v1/auth/refresh - rotates token and returns new pair', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const initialRefreshToken = regRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(initialRefreshToken);
  });

  test('POST /api/v1/auth/refresh - detects REPLAY ATTACK and invalidates family', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const initialRefreshToken = regRes.body.data.refreshToken;

    // First rotation (valid)
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });
    expect(firstRefresh.statusCode).toBe(200);

    // Attacker attempts to replay initialRefreshToken again!
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(replayRes.statusCode).toBe(403);
    expect(replayRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

    // Verify all tokens for this user family are revoked
    const activeTokens = await RefreshToken.find({ isRevoked: false });
    expect(activeTokens.length).toBe(0);
  });

  test('GET /api/v1/auth/me - returns user profile with valid Bearer token', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = regRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.data.user.email).toBe(validUser.email);
  });

  test('GET /api/v1/auth/me - rejects request without token with 401', async () => {
    const meRes = await request(app).get('/api/v1/auth/me');
    expect(meRes.statusCode).toBe(401);
  });

  test('GET /api/v1/auth/facebook - redirects when client initiates OAuth flow', async () => {
    const fbRes = await request(app).get('/api/v1/auth/facebook');
    // Expect 302 Redirect to either Facebook dialog or setup notice if keys aren't set
    expect(fbRes.statusCode).toBe(302);
    expect(fbRes.headers.location).toBeDefined();
  });

  test('POST /api/v1/auth/oauth/dev - authenticates and links Facebook identity', async () => {
    const devFbRes = await request(app)
      .post('/api/v1/auth/oauth/dev')
      .send({
        provider: 'facebook',
        email: 'facebook_engineer@example.com',
        name: 'Meta Engineer',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      });

    expect(devFbRes.statusCode).toBe(200);
    expect(devFbRes.body.data.user.email).toBe('facebook_engineer@example.com');
    expect(devFbRes.body.data.accessToken).toBeDefined();
    expect(devFbRes.headers['set-cookie']).toBeDefined();

    // Verify user document has facebookId populated
    const userInDb = await User.findOne({ email: 'facebook_engineer@example.com' });
    expect(userInDb).toBeDefined();
    expect(userInDb.facebookId).toBeDefined();
  });

  test('GET /api/v1/auth/me - authenticates via HttpOnly accessToken cookie without Authorization header', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const cookies = regRes.headers['set-cookie'];
    const accessCookie = cookies.find((c) => c.startsWith('accessToken='));
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toMatch(/HttpOnly/i);

    // Send request with only Cookie header
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [accessCookie]);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(validUser.email);
  });

  test('POST /api/v1/auth/logout - revokes refresh token in database and clears auth cookies', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const refreshToken = regRes.body.data.refreshToken;
    const cookies = regRes.headers['set-cookie'];
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

    // Check token is active in DB before logout
    const { hashToken } = require('../../src/utils/jwt');
    const tokenRecordBefore = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
    expect(tokenRecordBefore.isRevoked).toBe(false);

    // Call logout sending the refresh cookie
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [refreshCookie]);

    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify token is marked revoked in DB
    const tokenRecordAfter = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
    expect(tokenRecordAfter.isRevoked).toBe(true);
    expect(tokenRecordAfter.revokedAt).toBeDefined();

    // Verify cookies are cleared (max-age=0 or expires in the past)
    const clearCookies = logoutRes.headers['set-cookie'];
    expect(clearCookies).toBeDefined();
    expect(clearCookies.some((c) => c.startsWith('accessToken=;') || c.includes('accessToken=;'))).toBe(true);
    expect(clearCookies.some((c) => c.startsWith('refreshToken=;') || c.includes('refreshToken=;'))).toBe(true);
  });

  test('POST /api/v1/auth/revoke - revokes refresh token and prevents further rotation', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const initialRefreshToken = regRes.body.data.refreshToken;
    const { hashToken } = require('../../src/utils/jwt');

    // Call /revoke endpoint
    const revokeRes = await request(app)
      .post('/api/v1/auth/revoke')
      .send({ refreshToken: initialRefreshToken });

    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // Verify revoked in DB
    const tokenRecord = await RefreshToken.findOne({ tokenHash: hashToken(initialRefreshToken) });
    expect(tokenRecord.isRevoked).toBe(true);

    // Attempting to refresh with the revoked token must trigger reuse detection
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.statusCode).toBe(403);
    expect(refreshRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  test('PATCH /api/v1/auth/profile - updates user bio and avatar successfully', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = regRes.body.data.accessToken;

    const updateRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bio: 'Full-stack software engineer interested in distributed architectures.',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot',
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.bio).toBe('Full-stack software engineer interested in distributed architectures.');
    expect(updateRes.body.data.user.avatar).toBe('https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot');

    // Verify persisted in DB
    const dbUser = await User.findById(regRes.body.data.user._id);
    expect(dbUser.bio).toBe('Full-stack software engineer interested in distributed architectures.');
    expect(dbUser.avatar).toBe('https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot');
  });

  test('PATCH /api/v1/auth/profile - rejects unauthenticated profile update with 401', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .send({ bio: 'Hacker bio' });

    expect(res.statusCode).toBe(401);
  });
});


