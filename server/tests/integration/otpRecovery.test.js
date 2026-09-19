const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { ROLES } = require('../../src/constants/roles');
const emailService = require('../../src/utils/emailService');

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

  it('POST /api/v1/auth/forgot-password normalizes email with whitespace and mixed casing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: '  OtpTest@EXAMPLE.com  ' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await User.findById(testUser._id).select('+passwordResetOtp');
    expect(userInDb.passwordResetOtp).toBeDefined();
  });

  it('POST /api/v1/auth/forgot-password returns generic response for non-existent email (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent_user_999@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/password recovery instructions/i);
  });

  it('POST /api/v1/auth/forgot-password returns HTTP 503 when email service fails (does not swallow error)', async () => {
    // Spy and force sendPasswordRecoveryEmail to throw an SMTP connection/auth error
    const spy = jest
      .spyOn(emailService, 'sendPasswordRecoveryEmail')
      .mockRejectedValueOnce(new Error('Invalid login: 535-5.7.8 Username and Password not accepted'));

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    expect(res.body.error.message).toMatch(/unable to send password recovery email/i);

    spy.mockRestore();
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

  it('POST /api/v1/auth/verify-otp locks out user after 5 failed attempts (anti-brute-force)', async () => {
    const realOtp = '654321';
    testUser.passwordResetOtp = crypto.createHash('sha256').update(realOtp).digest('hex');
    testUser.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    testUser.passwordResetOtpAttempts = 4; // 5th attempt will exceed limit
    await testUser.save({ validateBeforeSave: false });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: '000000' });

    expect(res.status).toBe(400);

    // 6th attempt should return 429 lockout
    const lockoutRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: '000000' });

    expect(lockoutRes.status).toBe(429);
    expect(lockoutRes.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');

    // Verify OTP was cleared in database
    const userInDb = await User.findById(testUser._id).select('+passwordResetOtp');
    expect(userInDb.passwordResetOtp).toBeNull();
  });

  it('POST /api/v1/auth/verify-otp rejects expired OTP codes', async () => {
    const realOtp = '654321';
    testUser.passwordResetOtp = crypto.createHash('sha256').update(realOtp).digest('hex');
    testUser.passwordResetOtpExpires = new Date(Date.now() - 1000); // 1 sec in the past
    testUser.passwordResetOtpAttempts = 0;
    await testUser.save({ validateBeforeSave: false });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: realOtp });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_OTP');
  });

  it('POST /api/v1/auth/verify-otp succeeds with correct OTP, resets attempt count, and invalidates OTP for reuse', async () => {
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

    // Verify OTP was cleared so it cannot be reused
    const userInDb = await User.findById(testUser._id).select('+passwordResetOtp');
    expect(userInDb.passwordResetOtp).toBeNull();

    // Re-attempting with same OTP must be rejected
    const reuseRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: realOtp });
    expect(reuseRes.status).toBe(400);

    // Use the verified resetToken to reset the password
    const newPassword = 'BrandNewPassword123!';
    const resetRes = await request(app)
      .post(`/api/v1/auth/reset-password/${verifiedToken}`)
      .send({ password: newPassword });

    expect(resetRes.status).toBe(200);

    // Reusing the token must be rejected (single-use defense)
    const tokenReuseRes = await request(app)
      .post(`/api/v1/auth/reset-password/${verifiedToken}`)
      .send({ password: 'AnotherPassword123!' });
    expect(tokenReuseRes.status).toBe(400);
    expect(tokenReuseRes.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');

    // Verify user can now log in with the new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: newPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });
});
