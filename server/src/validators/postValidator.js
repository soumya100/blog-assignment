const { z } = require('zod');

const createPostSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string({ required_error: 'Content is required' })
    .min(10, 'Content must be at least 10 characters'),
  excerpt: z.string().max(300, 'Excerpt cannot exceed 300 characters').optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  coverImage: z.string().max(500).optional(),
});

const updatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .optional(),
  excerpt: z.string().max(300).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  coverImage: z.string().max(500).optional(),
});

const queryPostSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  tag: z.string().optional(),
  author: z.string().optional(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  queryPostSchema,
};
