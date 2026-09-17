const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const RefreshToken = require('../../src/models/RefreshToken');
const { ROLES, USER_STATUS } = require('../../src/constants/roles');
const { generateAccessToken, generateRefreshTokenString, hashToken } = require('../../src/utils/jwt');

describe('Admin Panel & RBAC Integration Tests', () => {
  let adminUser, regularUser;
  let adminToken, regularToken;

  beforeEach(async () => {
    adminUser = await User.create({
      username: 'super_admin',
      email: 'admin@test.com',
      password: 'Password123!',
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
    });
    adminToken = generateAccessToken(adminUser);

    regularUser = await User.create({
      username: 'standard_user',
      email: 'user@test.com',
      password: 'Password123!',
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
    });
    regularToken = generateAccessToken(regularUser);
  });

  test('GET /api/v1/admin/stats - Admin successfully retrieves dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.total).toBe(2);
  });

  test('GET /api/v1/admin/stats - Regular user is BLOCKED with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('PATCH /api/v1/admin/users/:id/role - Admin promotes user to ADMIN', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${regularUser._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.ADMIN });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toBe(ROLES.ADMIN);
  });

  test('PATCH /api/v1/admin/users/:id/role - Guard prevents demoting last remaining admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUser._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.USER });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('LAST_ADMIN_PROTECTION');
  });

  test('PATCH /api/v1/admin/users/:id/status - Deactivating user revokes all active refresh tokens', async () => {
    // Create an active refresh token for regularUser
    const tokenRaw = generateRefreshTokenString();
    await RefreshToken.create({
      tokenHash: hashToken(tokenRaw),
      user: regularUser._id,
      familyId: 'fam-123',
      expiresAt: new Date(Date.now() + 100000),
      isRevoked: false,
    });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${regularUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: USER_STATUS.DEACTIVATED });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe(USER_STATUS.DEACTIVATED);

    // Verify refresh token was revoked
    const updatedToken = await RefreshToken.findOne({ user: regularUser._id });
    expect(updatedToken.isRevoked).toBe(true);

    // Verify deactivated user cannot log in
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: regularUser.email, password: 'Password123!' });

    expect(loginRes.statusCode).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });
});
