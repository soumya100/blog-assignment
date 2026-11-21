process.env.NODE_ENV = 'test';
process.env.ENABLE_DEV_OAUTH = 'true';

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
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    if (mongoServer) {
      await mongoServer.stop().catch(() => {});
      mongoServer = undefined;
    }
    throw new Error('Test database setup failed. Refusing to run backend tests without MongoDB: ' + error.message);
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
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
