const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshTokenString, hashToken, verifyAccessToken } = require('../../src/utils/jwt');
const env = require('../../src/config/env');

describe('JWT Utility Tests', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    username: 'testuser',
    role: 'USER',
  };

  test('generates valid access token with claims and algorithm', () => {
    const token = generateAccessToken(mockUser);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(mockUser._id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.iss).toBe('devlog-api');
    expect(decoded.aud).toBe('devlog-client');
  });

  test('rejects expired access token', () => {
    const expiredToken = jwt.sign(
      { sub: mockUser._id, email: mockUser.email, role: mockUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-1s', algorithm: 'HS256', issuer: 'devlog-api', audience: 'devlog-client' }
    );

    expect(() => verifyAccessToken(expiredToken)).toThrow();
  });

  test('rejects token signed with wrong secret', () => {
    const maliciousToken = jwt.sign(
      { sub: mockUser._id, role: 'ADMIN' },
      'wrong_untrusted_secret_key_123456789',
      { algorithm: 'HS256', issuer: 'devlog-api', audience: 'devlog-client' }
    );

    expect(() => verifyAccessToken(maliciousToken)).toThrow();
  });

  test('rejects algorithm "none" attack payload', () => {
    // Attempting algorithm confusion / bypass
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: mockUser._id, role: 'ADMIN' })).toString('base64url');
    const algNoneToken = `${header}.${payload}.`;

    expect(() => verifyAccessToken(algNoneToken)).toThrow();
  });

  test('hashes refresh tokens deterministically using SHA-256', () => {
    const rawToken = generateRefreshTokenString();
    expect(rawToken.length).toBe(80); // 40 bytes in hex

    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 is 64 hex characters
  });
});
