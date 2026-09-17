const { registerSchema, loginSchema } = require('../../src/validators/authValidator');
const { createPostSchema } = require('../../src/validators/postValidator');
const { createCommentSchema } = require('../../src/validators/commentValidator');

describe('Zod Validation Schemas Unit Tests', () => {
  describe('Registration Validator', () => {
    test('passes on strong password and valid inputs', () => {
      const valid = {
        username: 'valid_user1',
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    test('fails on weak passwords without special char or uppercase', () => {
      const weak = {
        username: 'user1',
        email: 'test@example.com',
        password: 'weakpassword',
      };
      const result = registerSchema.safeParse(weak);
      expect(result.success).toBe(false);
    });

    test('fails on invalid username with spaces or special characters', () => {
      const invalid = {
        username: 'bad user name!',
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Post Validator', () => {
    test('validates post title and content length limits', () => {
      const valid = {
        title: 'Valid Post Title',
        content: 'This is sufficiently long content for a blog post.',
        tags: ['tech', 'node'],
      };
      expect(createPostSchema.safeParse(valid).success).toBe(true);

      const tooShort = {
        title: 'Hi',
        content: 'Short',
      };
      expect(createPostSchema.safeParse(tooShort).success).toBe(false);
    });
  });

  describe('Comment Validator', () => {
    test('rejects empty comment', () => {
      const empty = { content: '   ' };
      expect(createCommentSchema.safeParse({ content: '' }).success).toBe(false);
    });

    test('accepts valid comment', () => {
      const valid = { content: 'Great article, thanks for sharing!' };
      expect(createCommentSchema.safeParse(valid).success).toBe(true);
    });
  });
});
