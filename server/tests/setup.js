const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_super_secure_32_characters_long_jwt';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_super_secure_32_characters_long_jwt';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
