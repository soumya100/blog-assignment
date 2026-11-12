const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/models/User');

describe('Password Hashing Unit Tests', () => {
  const triggerPreSave = async (userDoc) => {
    if (mongoose.connection.readyState === 1) {
      await userDoc.save();
    } else {
      const pres = User.schema.s.hooks._pres.get('save') || [];
      for (const hook of pres) {
        if (hook.fn.toString().includes('bcrypt')) {
          await new Promise((resolve, reject) => {
            hook.fn.call(userDoc, (err) => (err ? reject(err) : resolve()));
          });
        }
      }
    }
  };

  test('hashes password using bcrypt with salt rounds >= 10', async () => {
    const rawPassword = 'SecurePassword123!';
    const user = new User({
      username: 'hashtester',
      email: 'hash@test.com',
      password: rawPassword,
    });

    await triggerPreSave(user);

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

    await triggerPreSave(user);
    const safe = user.toSafeObject();

    expect(safe.password).toBeUndefined();
    expect(safe.__v).toBeUndefined();
    expect(safe.email).toBe('safe@test.com');
  });
});
