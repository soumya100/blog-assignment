const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Draft = require('../../src/models/Draft');
const Post = require('../../src/models/Post');
const { generateAccessToken } = require('../../src/utils/jwt');

describe('Account-owned drafts and publishing workflow', () => {
  let author;
  let anotherAuthor;
  let authorToken;
  let anotherToken;

  beforeEach(async () => {
    author = await User.create({
      username: 'draft_author',
      email: 'draft-author@test.com',
      password: 'Password123!',
    });
    anotherAuthor = await User.create({
      username: 'draft_reader',
      email: 'draft-reader@test.com',
      password: 'Password123!',
    });
    authorToken = generateAccessToken(author);
    anotherToken = generateAccessToken(anotherAuthor);
  });

  test('draft endpoints require authentication', async () => {
    const response = await request(app).get('/api/v1/drafts');
    expect(response.statusCode).toBe(401);
  });

  test('author can save a partial draft and retrieve it from their own list', async () => {
    const created = await request(app)
      .post('/api/v1/drafts')
      .set('Authorization', 'Bearer ' + authorToken)
      .send({ title: 'Early idea', content: 'A few unfinished notes.' });

    expect(created.statusCode).toBe(201);
    expect(created.body.data.title).toBe('Early idea');

    const listed = await request(app)
      .get('/api/v1/drafts')
      .set('Authorization', 'Bearer ' + authorToken);

    expect(listed.statusCode).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]._id).toBe(created.body.data._id);

    const otherList = await request(app)
      .get('/api/v1/drafts')
      .set('Authorization', 'Bearer ' + anotherToken);
    expect(otherList.body.data).toHaveLength(0);
  });

  test('another user cannot read or update someone else draft', async () => {
    const draft = await Draft.create({ title: 'Private notes', content: 'This is private.', author: author._id });

    const read = await request(app)
      .get('/api/v1/drafts/' + draft._id)
      .set('Authorization', 'Bearer ' + anotherToken);
    expect(read.statusCode).toBe(404);

    const update = await request(app)
      .patch('/api/v1/drafts/' + draft._id)
      .set('Authorization', 'Bearer ' + anotherToken)
      .send({ title: 'Stolen title' });
    expect(update.statusCode).toBe(404);

    const unchanged = await Draft.findById(draft._id);
    expect(unchanged.title).toBe('Private notes');
  });

  test('publishing rejects incomplete drafts without deleting them', async () => {
    const draft = await Draft.create({ title: 'No content', content: 'short', author: author._id });

    const response = await request(app)
      .post('/api/v1/drafts/' + draft._id + '/publish')
      .set('Authorization', 'Bearer ' + authorToken);

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe('DRAFT_INCOMPLETE');
    expect(await Draft.findById(draft._id)).not.toBeNull();
    expect(await Post.countDocuments({ author: author._id })).toBe(0);
  });

  test('author can publish a complete draft and the draft is removed', async () => {
    const draft = await Draft.create({
      title: 'A finished article from a draft',
      content: 'This article has enough content to pass the publication requirements.',
      excerpt: 'A short summary',
      tags: ['React', 'Engineering'],
      author: author._id,
    });

    const response = await request(app)
      .post('/api/v1/drafts/' + draft._id + '/publish')
      .set('Authorization', 'Bearer ' + authorToken);

    expect(response.statusCode).toBe(201);
    expect(response.body.data.slug).toBe('a-finished-article-from-a-draft');
    expect(response.body.data.author._id.toString()).toBe(author._id.toString());
    expect(await Draft.findById(draft._id)).toBeNull();
    expect(await Post.countDocuments({ author: author._id, isDeleted: false })).toBe(1);
  });
});
