const { z } = require('zod');

const createCommentSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
  parentCommentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent comment ID format')
    .optional()
    .nullable(),
});

const updateCommentSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
});

module.exports = {
  createCommentSchema,
  updateCommentSchema,
};
