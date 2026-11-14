const { spawnSync } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');
const SavedPost = require('../../src/models/SavedPost');
const ReadingHistory = require('../../src/models/ReadingHistory');
const { recordReading, getReadingHistory } = require('../../src/services/readingHistoryService');
const savedPostController = require('../../src/controllers/savedPostController');
const authService = require('../../src/services/authService');

const serverRoot = path.resolve(__dirname, '../..');

const runNode = (script, overrides = {}) => spawnSync(process.execPath, ['-e', script], {
  cwd: serverRoot,
  encoding: 'utf8',
  timeout: 10000,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'production-access-secret-0123456789-ABCDEFG',
    JWT_REFRESH_SECRET: 'production-refresh-secret-0123456789-ABCDEFG',
    COOKIE_SECRET: 'production-cookie-secret-0123456789-ABCDEFG',
    MONGODB_URI: '',
    UPLOAD_DIR: '/var/data/uploads',
    ...overrides,
  },
});

const makeResponse = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const unique = () => new mongoose.Types.ObjectId().toString();

const createUser = (suffix) => User.create({
  username: `user_${suffix}`,
  email: `${suffix}@example.test`,
  password: 'TestPassword123!',
});

const createPost = (author, status = 'scheduled') => Post.create({
  title: `Visibility test ${unique()}`,
  slug: `visibility-test-${unique()}`,
  content: 'This article body must never leak to an unrelated reader.',
  excerpt: 'Visibility regression fixture',
  author: author._id,
  status,
  publishedAt: status === 'published' ? new Date() : null,
});

describe('production security regression guards', () => {
  it('rejects missing production signing secrets instead of using development defaults', () => {
    const result = runNode(
      "const env = require('./src/config/env'); env.validateProductionConfig();",
      { JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: '', COOKIE_SECRET: '' }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('JWT_ACCESS_SECRET');
    expect(result.stderr).not.toContain('dev_secret_access_key');
  });

  it('rejects production startup without an explicit absolute upload storage path', () => {
    const result = runNode(
      "const env = require('./src/config/env'); env.validateProductionConfig();",
      { UPLOAD_DIR: '' }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('UPLOAD_DIR');
  });

  it('requires explicit administrator credentials for the production provisioning command', () => {
    const result = runNode(
      "require('./src/scripts/provisionAdmin')().then(() => process.exit(2)).catch((error) => { console.log(error.message); process.exit(error.message.includes('ADMIN_EMAIL') ? 0 : 3); });",
      { ADMIN_EMAIL: '', ADMIN_USERNAME: '', ADMIN_PASSWORD: '' }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('ADMIN_EMAIL');
  });

  it('does not register the development OAuth endpoint in production', () => {
    const result = runNode(
      "const router = require('./src/routes/authRoutes'); const enabled = router.stack.some((layer) => layer.route && layer.route.path === '/oauth/dev'); process.exit(enabled ? 2 : 0);",
      { ENABLE_DEV_OAUTH: 'true' }
    );

    expect(result.status).toBe(0);
  });

  it('keeps the development OAuth endpoint opt-in outside production', () => {
    const result = runNode(
      "const router = require('./src/routes/authRoutes'); const enabled = router.stack.some((layer) => layer.route && layer.route.path === '/oauth/dev'); process.exit(enabled ? 0 : 2);",
      { NODE_ENV: 'test', ENABLE_DEV_OAUTH: 'true' }
    );

    expect(result.status).toBe(0);
  });


  it('skips automatic administrator and sample-data seeding in production', () => {
    const result = runNode(
      "const mongoose = require('mongoose'); const { ensureInitialData } = require('./src/server'); ensureInitialData().then(() => process.exit(mongoose.connection.readyState === 0 ? 0 : 2));"
    );

    expect(result.status).toBe(0);
  });

  it('blocks the destructive sample seed script in production', () => {
    const result = runNode(
      "require('./src/scripts/seed')().then(() => process.exit(2)).catch((error) => { console.log(error.message); process.exit(error.message.includes('disabled in production') ? 0 : 3); });"
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('disabled in production');
  });

  it('refuses production startup without MONGODB_URI and does not start MongoMemoryServer', () => {
    const result = runNode(
      "require('./src/config/database').connectDB().then(() => process.exit(2)).catch((error) => { console.log(error.message); process.exit(error.message.includes('MONGODB_URI is required') ? 0 : 3); });"
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('MONGODB_URI is required in production');
  });
});

describe('unpublished post visibility in reader features', () => {
  it('rejects another user recording a scheduled article in reading history', async () => {
    const author = await createUser(unique());
    const reader = await createUser(unique());
    const scheduledPost = await createPost(author, 'scheduled');

    await expect(recordReading(reader._id, scheduledPost._id))
      .rejects.toMatchObject({ statusCode: 404, code: 'POST_NOT_FOUND' });
  });

  it('does not populate previously recorded scheduled posts in reading history', async () => {
    const author = await createUser(unique());
    const reader = await createUser(unique());
    const scheduledPost = await createPost(author, 'scheduled');
    await ReadingHistory.create({ user: reader._id, post: scheduledPost._id });

    const history = await getReadingHistory(reader._id);

    expect(history).toHaveLength(1);
    expect(history[0].post).toBeNull();
  });

  it('does not allow another user to save a scheduled article', async () => {
    const author = await createUser(unique());
    const reader = await createUser(unique());
    const scheduledPost = await createPost(author, 'scheduled');
    const req = { params: { postId: scheduledPost._id.toString() }, user: { _id: reader._id } };
    const res = makeResponse();
    let forwardedError;

    await savedPostController.savePost(req, res, (error) => { forwardedError = error; });

    expect(forwardedError).toMatchObject({ statusCode: 404, code: 'POST_NOT_FOUND' });
    expect(await SavedPost.countDocuments({ user: reader._id, post: scheduledPost._id })).toBe(0);
  });

  it('does not return previously saved scheduled articles or their content', async () => {
    const author = await createUser(unique());
    const reader = await createUser(unique());
    const scheduledPost = await createPost(author, 'scheduled');
    await SavedPost.create({ user: reader._id, post: scheduledPost._id });

    const req = { user: { _id: reader._id } };
    const res = makeResponse();
    await savedPostController.listSavedPosts(req, res, (error) => { throw error; });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('blocks linking an existing account using an unverified Facebook email', async () => {
    const admin = await User.create({
      username: `admin_${unique()}`,
      email: `admin_${unique()}@example.test`,
      password: 'TestPassword123!',
      role: 'ADMIN',
    });

    await expect(authService.oauthLogin({
      provider: 'facebook',
      email: admin.email,
      name: 'Untrusted Provider',
      providerId: `facebook_${unique()}`,
      emailVerified: false,
    })).rejects.toMatchObject({ statusCode: 409, code: 'OAUTH_EMAIL_NOT_VERIFIED' });

    const unchangedAdmin = await User.findById(admin._id);
    expect(unchangedAdmin.role).toBe('ADMIN');
    expect(unchangedAdmin.facebookId).toBeUndefined();
  });

  it('allows a new Facebook identity without trusting an unverified email address', async () => {
    const providerId = `facebook_${unique()}`;
    const result = await authService.oauthLogin({
      provider: 'facebook',
      email: `${providerId}@devlog-user.internal`,
      name: 'Facebook User',
      providerId,
      emailVerified: false,
    });

    expect(result.user.facebookId).toBe(providerId);
    expect(result.user.email).toBe(`${providerId}@devlog-user.internal`);
  });

  it('allows account linking only when Google explicitly verifies the email', async () => {
    const user = await createUser(unique());
    const result = await authService.oauthLogin({
      provider: 'google',
      email: user.email,
      name: 'Verified Google User',
      providerId: `google_${unique()}`,
      emailVerified: true,
    });

    const linked = await User.findById(user._id);
    expect(linked.googleId).toBeTruthy();
    expect(result.user._id.toString()).toBe(user._id.toString());
  });

  it('preserves access to an author\'s own scheduled article and to published articles', async () => {
    const author = await createUser(unique());
    const reader = await createUser(unique());
    const scheduledPost = await createPost(author, 'scheduled');
    const publishedPost = await createPost(author, 'published');

    await expect(recordReading(author._id, scheduledPost._id)).resolves.toBeTruthy();
    await expect(recordReading(reader._id, publishedPost._id)).resolves.toBeTruthy();
  });
});
