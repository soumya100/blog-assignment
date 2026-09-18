const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { ROLES } = require('../../src/constants/roles');

describe('Cryptographic OTP & Password Recovery End-to-End', () => {
  let testUser;
  const userPassword = 'InitialStrongPass123!';

  beforeEach(async () => {
    testUser = await User.create({
      username: 'otp_tester',
      email: 'otptest@example.com',
      password: userPassword,
      role: ROLES.USER,
    });
  });

  it('POST /api/v1/auth/forgot-password dispatches OTP and generates reset token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resetUrl).toBeDefined();

    // Verify database record has hashed OTP and expiry set
    const userInDb = await User.findById(testUser._id).select('+passwordResetOtp +passwordResetOtpExpires');
    expect(userInDb.passwordResetOtp).toBeDefined();
    expect(userInDb.passwordResetOtpExpires).toBeDefined();
    expect(userInDb.passwordResetOtpExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it('POST /api/v1/auth/verify-otp rejects incorrect OTP and tracks attempts', async () => {
    // Generate an OTP manually for testUser
    const realOtp = '654321';
    testUser.passwordResetOtp = crypto.createHash('sha256').update(realOtp).digest('hex');
    testUser.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    testUser.passwordResetOtpAttempts = 0;
    await testUser.save({ validateBeforeSave: false });

    // Try wrong OTP
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: '111111' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/remaining/i);

    const userInDb = await User.findById(testUser._id).select('+passwordResetOtpAttempts');
    expect(userInDb.passwordResetOtpAttempts).toBe(1);
  });

  it('POST /api/v1/auth/verify-otp succeeds with correct OTP and provides reset token', async () => {
    const realOtp = '876543';
    testUser.passwordResetOtp = crypto.createHash('sha256').update(realOtp).digest('hex');
    testUser.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    testUser.passwordResetOtpAttempts = 0;
    await testUser.save({ validateBeforeSave: false });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: realOtp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resetToken).toBeDefined();

    const verifiedToken = res.body.data.resetToken;

    // Use the verified resetToken to reset the password
    const newPassword = 'BrandNewPassword123!';
    const resetRes = await request(app)
      .post(`/api/v1/auth/reset-password/${verifiedToken}`)
      .send({ password: newPassword });

    expect(resetRes.status).toBe(200);

    // Verify user can now log in with the new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: newPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });
});
