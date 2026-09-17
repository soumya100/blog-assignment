const { z } = require('zod');
const { ROLES, USER_STATUS } = require('../constants/roles');

const updateRoleSchema = z.object({
  role: z.enum(Object.values(ROLES), {
    required_error: 'Valid role is required (ADMIN or USER)',
  }),
});

const updateStatusSchema = z.object({
  status: z.enum(Object.values(USER_STATUS), {
    required_error: 'Valid status is required (ACTIVE or DEACTIVATED)',
  }),
});

const updateProfileSchema = z.object({
  bio: z.string().max(250, 'Bio cannot exceed 250 characters').optional(),
  avatar: z.string().max(500).optional(),
});

module.exports = {
  updateRoleSchema,
  updateStatusSchema,
  updateProfileSchema,
};
