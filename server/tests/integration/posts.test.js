const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');
const { ROLES } = require('../../src/constants/roles');
const { generateAccessToken } = require('../../src/utils/jwt');

describe('Blog Posts CRUD & Authorization Tests', () => {
  let authorUser, attackerUser, adminUser;
  let authorToken, attackerToken, adminToken;

  beforeEach(async () => {
    authorUser = await User.create({
      username: 'author_dev',
      email: 'author@test.com',
      password: 'Password123!',
      role: ROLES.USER,
    });
    authorToken = generateAccessToken(authorUser);

    attackerUser = await User.create({
      username: 'attacker_user',
      email: 'attacker@test.com',
      password: 'Password123!',
      role: ROLES.USER,
    });
    attackerToken = generateAccessToken(attackerUser);

    adminUser = await User.create({
      username: 'admin_user',
      email: 'admin@test.com',
      password: 'Password123!',
      role: ROLES.ADMIN,
    });
    adminToken = generateAccessToken(adminUser);
  });

  test('POST /api/v1/posts - creates a new post with auto-generated slug', async () => {
    const postPayload = {
      title: 'Building Scalable MERN Applications',
      content: 'Detailed discussion on layering and decoupled architectures.',
      tags: ['nodejs', 'react'],
    };

    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send(postPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('building-scalable-mern-applications');
    expect(res.body.data.author._id.toString()).toBe(authorUser._id.toString());
  });

  test('POST /api/v1/posts - generates unique slug for identical titles', async () => {
    const postPayload = {
      title: 'Duplicate Title Test',
      content: 'First post content here.',
    };

    const res1 = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send(postPayload);

    const res2 = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authorToken}`)
      .send(postPayload);

    expect(res1.body.data.slug).toBe('duplicate-title-test');
    expect(res2.body.data.slug).toBe('duplicate-title-test-1');
  });

  test('PATCH /api/v1/posts/:id - Author can edit their own post', async () => {
    const post = await Post.create({
      title: 'Original Title',
      slug: 'original-title',
      content: 'Original content description.',
      author: authorUser._id,
    });

    const res = await request(app)
      .patch(`/api/v1/posts/${post._id}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ title: 'Updated Title By Author' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Title By Author');
    expect(res.body.data.slug).toBe('updated-title-by-author');
  });

  test('PATCH /api/v1/posts/:id - IDOR / BOLA Prevention: Attacker CANNOT edit another user post', async () => {
    const post = await Post.create({
      title: 'Victim Post',
      slug: 'victim-post',
      content: 'Sensitive or high-value article.',
      author: authorUser._id,
    });

    const res = await request(app)
      .patch(`/api/v1/posts/${post._id}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ title: 'Defaced By Attacker' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Verify post title remains intact
    const unchangedPost = await Post.findById(post._id);
    expect(unchangedPost.title).toBe('Victim Post');
  });

  test('DELETE /api/v1/posts/:id - Soft Deletes post (isDeleted: true)', async () => {
    const post = await Post.create({
      title: 'Post to Soft Delete',
      slug: 'post-to-soft-delete',
      content: 'Content that will be soft-deleted.',
      author: authorUser._id,
    });

    const res = await request(app)
      .delete(`/api/v1/posts/${post._id}`)
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.statusCode).toBe(200);

    // Verify in DB that it is soft-deleted, not hard-deleted
    const dbPost = await Post.findById(post._id);
    expect(dbPost.isDeleted).toBe(true);
    expect(dbPost.deletedAt).toBeDefined();

    // Verify public listing excludes the deleted post
    const listRes = await request(app).get('/api/v1/posts');
    const ids = listRes.body.data.map((p) => p._id);
    expect(ids).not.toContain(post._id.toString());
  });

  test('POST /api/v1/posts/:id/restore - Admin can restore soft-deleted post', async () => {
    const post = await Post.create({
      title: 'Deleted Post',
      slug: 'deleted-post',
      content: 'Deleted content.',
      author: authorUser._id,
      isDeleted: true,
      deletedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/v1/posts/${post._id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const dbPost = await Post.findById(post._id);
    expect(dbPost.isDeleted).toBe(false);
  });
});
