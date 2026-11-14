const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');
const PostReaction = require('../../src/models/PostReaction');
const AuthorFollow = require('../../src/models/AuthorFollow');
const ContentReport = require('../../src/models/ContentReport');
const Mention = require('../../src/models/Mention');
const { ROLES } = require('../../src/constants/roles');
const { generateAccessToken } = require('../../src/utils/jwt');

describe('Reader engagement, community, mentions and moderation', () => {
  let author;
  let reader;
  let admin;
  let authorToken;
  let readerToken;
  let adminToken;
  let post;

  beforeEach(async () => {
    author = await User.create({ username: 'community_author', email: 'community-author@test.com', password: 'Password123!', role: ROLES.USER });
    reader = await User.create({ username: 'community_reader', email: 'community-reader@test.com', password: 'Password123!', role: ROLES.USER });
    admin = await User.create({ username: 'community_admin', email: 'community-admin@test.com', password: 'Password123!', role: ROLES.ADMIN });
    authorToken = generateAccessToken(author);
    readerToken = generateAccessToken(reader);
    adminToken = generateAccessToken(admin);
    post = await Post.create({ title: 'Community test article', slug: 'community-test-article', content: 'A published article for community feature integration tests.', author: author._id });
  });

  test('reader can react and reaction counts are returned', async () => {
    const response = await request(app).post('/api/v1/community/posts/' + post._id + '/reactions')
      .set('Authorization', 'Bearer ' + readerToken).send({ type: 'clap' });
    expect(response.statusCode).toBe(200);
    expect(response.body.data.claps).toBe(1);
    expect(await PostReaction.countDocuments({ post: post._id, user: reader._id })).toBe(1);
  });

  test('reader can follow author and following feed includes their published articles', async () => {
    const followed = await request(app).post('/api/v1/community/authors/' + author._id + '/follow')
      .set('Authorization', 'Bearer ' + readerToken).send({});
    expect(followed.statusCode).toBe(200);
    expect(followed.body.data.following).toBe(true);
    expect(await AuthorFollow.countDocuments({ follower: reader._id, author: author._id })).toBe(1);

    const feed = await request(app).get('/api/v1/community/feed/following')
      .set('Authorization', 'Bearer ' + readerToken);
    expect(feed.statusCode).toBe(200);
    expect(feed.body.data.some((item) => String(item._id) === String(post._id))).toBe(true);
  });

  test('comment @mentions create a private mention inbox item', async () => {
    const response = await request(app).post('/api/v1/posts/' + post._id + '/comments')
      .set('Authorization', 'Bearer ' + readerToken)
      .send({ content: 'Hello @community_author, please review this.' });
    expect(response.statusCode).toBe(201);
    expect(await Mention.countDocuments({ recipient: author._id, comment: response.body.data._id })).toBe(1);
  });

  test('reader reports content and administrators can moderate it', async () => {
    const report = await request(app).post('/api/v1/community/reports')
      .set('Authorization', 'Bearer ' + readerToken)
      .send({ targetType: 'post', targetId: post._id, reason: 'spam', details: 'This appears to be spam.' });
    expect(report.statusCode).toBe(201);
    expect(await ContentReport.countDocuments({ target: post._id })).toBe(1);

    const queue = await request(app).get('/api/v1/admin/reports')
      .set('Authorization', 'Bearer ' + adminToken);
    expect(queue.statusCode).toBe(200);
    expect(queue.body.data).toHaveLength(1);

    const updated = await request(app).patch('/api/v1/admin/reports/' + report.body.data.id)
      .set('Authorization', 'Bearer ' + adminToken).send({ status: 'resolved' });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.data.status).toBe('resolved');
  });
});
