const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');
const Comment = require('../../src/models/Comment');
const { ROLES } = require('../../src/constants/roles');
const { generateAccessToken } = require('../../src/utils/jwt');

describe('Comments Integration & IDOR Tests', () => {
  let user1, user2, admin;
  let token1, token2, adminToken;
  let testPost;

  beforeEach(async () => {
    user1 = await User.create({ username: 'user_one', email: 'one@test.com', password: 'Password123!', role: ROLES.USER });
    token1 = generateAccessToken(user1);

    user2 = await User.create({ username: 'user_two', email: 'two@test.com', password: 'Password123!', role: ROLES.USER });
    token2 = generateAccessToken(user2);

    admin = await User.create({ username: 'admin_mod', email: 'mod@test.com', password: 'Password123!', role: ROLES.ADMIN });
    adminToken = generateAccessToken(admin);

    testPost = await Post.create({
      title: 'Target Post for Comments',
      slug: 'target-post-comments',
      content: 'This is the main post content where users will comment.',
      author: user1._id,
    });
  });

  test('POST /api/v1/posts/:postId/comments - creates comment successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Great article, thanks for writing this!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('Great article, thanks for writing this!');
    expect(res.body.data.author.username).toBe(user2.username);
  });

  test('POST /api/v1/posts/:postId/comments - returns 404 if post is soft-deleted', async () => {
    testPost.isDeleted = true;
    await testPost.save();

    const res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Should fail because post is deleted' });

    expect(res.statusCode).toBe(404);
  });

  test('PATCH /api/v1/comments/:id - Author can edit own comment', async () => {
    const comment = await Comment.create({
      post: testPost._id,
      author: user2._id,
      content: 'Original comment text',
    });

    const res = await request(app)
      .patch(`/api/v1/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Edited comment text' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.content).toBe('Edited comment text');
  });

  test('PATCH /api/v1/comments/:id - IDOR Prevention: Other user CANNOT edit comment', async () => {
    const comment = await Comment.create({
      post: testPost._id,
      author: user1._id,
      content: 'Original comment by user1',
    });

    const res = await request(app)
      .patch(`/api/v1/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Malicious modification by user2' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('DELETE /api/v1/comments/:id - Admin can delete any comment', async () => {
    const comment = await Comment.create({
      post: testPost._id,
      author: user1._id,
      content: 'Inappropriate comment to be moderated',
    });

    const res = await request(app)
      .delete(`/api/v1/comments/${comment._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const dbComment = await Comment.findById(comment._id);
    expect(dbComment.isDeleted).toBe(true);
  });
});
