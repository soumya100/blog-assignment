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

  test('GET comments returns nested replies recursively and supports top sorting', async () => {
    const root = await Comment.create({ post: testPost._id, author: user1._id, content: 'Root comment', likes: [user2._id] });
    const reply = await Comment.create({
      post: testPost._id, author: user2._id, content: 'First-level reply',
      parentComment: root._id, ancestors: [root._id], threadRoot: root._id,
    });
    await Comment.create({
      post: testPost._id, author: user1._id, content: 'Nested reply',
      parentComment: reply._id, ancestors: [root._id, reply._id], threadRoot: root._id,
    });

    const res = await request(app).get(`/api/v1/posts/${testPost._id}/comments?sort=top&limit=10`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].replies[0].replies[0].content).toBe('Nested reply');
    expect(res.body.pagination.sort).toBe('top');
  });

  test('GET comment replies exposes cursor metadata', async () => {
    const root = await Comment.create({ post: testPost._id, author: user1._id, content: 'Root comment' });
    await Comment.create({ post: testPost._id, author: user2._id, content: 'Reply one', parentComment: root._id });
    await Comment.create({ post: testPost._id, author: user1._id, content: 'Reply two', parentComment: root._id });

    const res = await request(app).get(`/api/v1/comments/${root._id}/replies?limit=1`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.hasMore).toBe(true);
    expect(res.body.pagination.nextCursor).toBeTruthy();
  });

  test('POST /api/v1/posts/:postId/comments - creates deep nested reply with correct ancestry and threadRoot', async () => {
    // 1. Create root comment via API
    const rootRes = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ content: 'Root comment by user 1' });
    expect(rootRes.statusCode).toBe(201);
    const rootId = rootRes.body.data._id;

    // 2. Create level 2 reply via API
    const reply1Res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Level 2 reply by user 2', parentCommentId: rootId });
    expect(reply1Res.statusCode).toBe(201);
    const reply1Id = reply1Res.body.data._id;
    expect(reply1Res.body.data.threadRoot).toBe(rootId);
    expect(reply1Res.body.data.ancestors.map(String)).toContain(rootId);

    // 3. Create level 3 reply via API
    const reply2Res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ content: 'Level 3 reply by user 1', parentCommentId: reply1Id });
    expect(reply2Res.statusCode).toBe(201);
    expect(reply2Res.body.data.threadRoot).toBe(rootId);
    expect(reply2Res.body.data.ancestors.map(String)).toEqual(
      expect.arrayContaining([rootId, reply1Id])
    );
  });

  test('POST /api/v1/posts/:postId/comments - rejects cross-post reply', async () => {
    const anotherPost = await Post.create({
      title: 'Another Post',
      slug: 'another-post',
      content: 'Different post content',
      author: user2._id,
    });

    const rootOnAnotherPost = await Comment.create({
      post: anotherPost._id,
      author: user2._id,
      content: 'Comment on another post',
    });

    const res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        content: 'Cross post reply attempt',
        parentCommentId: rootOnAnotherPost._id,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('CROSS_POST_REPLY_FORBIDDEN');
  });

  test('POST /api/v1/posts/:postId/comments - rejects replying to deleted parent comment', async () => {
    const root = await Comment.create({
      post: testPost._id,
      author: user1._id,
      content: 'Root to be deleted',
      isDeleted: true,
    });

    const res = await request(app)
      .post(`/api/v1/posts/${testPost._id}/comments`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        content: 'Replying to deleted comment',
        parentCommentId: root._id,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('PARENT_COMMENT_NOT_FOUND');
  });

  test('POST /api/v1/comments/:id/like - toggles like and updates engagement score atomically', async () => {
    const comment = await Comment.create({
      post: testPost._id,
      author: user1._id,
      content: 'Comment to like',
      likes: [],
      likesCount: 0,
      engagementScore: 0,
    });

    // 1. Like comment
    const likeRes = await request(app)
      .post(`/api/v1/comments/${comment._id}/like`)
      .set('Authorization', `Bearer ${token2}`);
    expect(likeRes.statusCode).toBe(200);
    expect(likeRes.body.data.liked).toBe(true);
    expect(likeRes.body.data.likesCount).toBe(1);

    const likedDoc = await Comment.findById(comment._id);
    expect(likedDoc.engagementScore).toBe(2);

    // 2. Unlike comment
    const unlikeRes = await request(app)
      .post(`/api/v1/comments/${comment._id}/like`)
      .set('Authorization', `Bearer ${token2}`);
    expect(unlikeRes.statusCode).toBe(200);
    expect(unlikeRes.body.data.liked).toBe(false);
    expect(unlikeRes.body.data.likesCount).toBe(0);

    const unlikedDoc = await Comment.findById(comment._id);
    expect(unlikedDoc.engagementScore).toBe(0);
  });

  test('DELETE /api/v1/comments/:id - recursively soft-deletes entire descendant subtree', async () => {
    const root = await Comment.create({ post: testPost._id, author: user1._id, content: 'Subtree root' });
    const child1 = await Comment.create({
      post: testPost._id,
      author: user2._id,
      content: 'Child 1',
      parentComment: root._id,
      ancestors: [root._id],
      threadRoot: root._id,
    });
    const grandchild = await Comment.create({
      post: testPost._id,
      author: user1._id,
      content: 'Grandchild',
      parentComment: child1._id,
      ancestors: [root._id, child1._id],
      threadRoot: root._id,
    });

    const res = await request(app)
      .delete(`/api/v1/comments/${root._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);

    const rootDoc = await Comment.findById(root._id);
    const childDoc = await Comment.findById(child1._id);
    const grandchildDoc = await Comment.findById(grandchild._id);

    expect(rootDoc.isDeleted).toBe(true);
    expect(childDoc.isDeleted).toBe(true);
    expect(grandchildDoc.isDeleted).toBe(true);
  });
});