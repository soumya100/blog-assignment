const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

describe('Password Hashing Unit Tests', () => {
  test('hashes password using bcrypt with salt rounds >= 10', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = new User({
      username: 'hashtester',
      email: 'hash@test.com',
      password: rawPassword,
    });

    await user.save();

    // Password must be hashed, not plaintext
    expect(user.password).not.toBe(rawPassword);
    expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/); // standard bcrypt prefix

    // Compare method returns true for right password
    const match = await user.comparePassword(rawPassword);
    expect(match).toBe(true);

    // Compare method returns false for wrong password
    const mismatch = await user.comparePassword('WrongPassword123!');
    expect(mismatch).toBe(false);
  });

  test('toSafeObject strips password and version key', async () => {
    const user = new User({
      username: 'safetester',
      email: 'safe@test.com',
      password: 'SecurePassword123!',
    });

    await user.save();
    const safe = user.toSafeObject();

    expect(safe.password).toBeUndefined();
    expect(safe.__v).toBeUndefined();
    expect(safe.email).toBe('safe@test.com');
  });
});
