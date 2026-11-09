const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_super_secure_32_characters_long_jwt';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_super_secure_32_characters_long_jwt';

  try {
    let uri = process.env.MONGODB_URI;
    if (!uri) {
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000, directConnection: true });
  } catch (err) {
    // If MongoMemoryServer cannot bind in isolated environments, tests that do not need DB proceed
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clear collections between tests for clean isolation
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
