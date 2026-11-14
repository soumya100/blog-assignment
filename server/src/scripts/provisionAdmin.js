const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const { ROLES, USER_STATUS } = require('../constants/roles');
const logger = require('../utils/logger');

const provisionAdmin = async () => {
  if (env.NODE_ENV !== 'production') {
    throw new Error('Administrator provisioning is intended for an explicitly configured production environment.');
  }

  env.validateProductionConfig();

  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const username = (env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';

  if (!email || !username || !password) {
    throw new Error('Set ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD before provisioning.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    throw new Error('ADMIN_USERNAME must contain 3-30 lowercase letters, numbers, or underscores.');
  }
  if (
    password.length < 16 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    throw new Error('ADMIN_PASSWORD must be at least 16 characters and include uppercase, lowercase, number, and special character.');
  }

  await connectDB();

  try {
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN }).select('_id');
    if (existingAdmin) {
      throw new Error('An administrator already exists. Refusing to create another bootstrap administrator.');
    }

    const existingAccount = await User.findOne({
      $or: [{ email }, { username }],
    }).select('_id');
    if (existingAccount) {
      throw new Error('The configured administrator email or username is already in use.');
    }

    await User.create({
      username,
      email,
      password,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      bio: 'Platform Administrator',
    });

    logger.info(`Production administrator provisioned for ${email}. No credentials were logged.`);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  provisionAdmin()
    .then(() => { process.exitCode = 0; })
    .catch(async (error) => {
      logger.error(`Administrator provisioning failed: ${error.message}`);
      await disconnectDB();
      process.exitCode = 1;
    });
}

module.exports = provisionAdmin;
