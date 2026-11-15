/**
 * Public author projection used by post and comment responses.
 * Never serialize private account fields or legacy inline/oversized avatar data.
 */
const sanitizePublicUser = (user) => {
  if (!user) return user;
  const value = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete value.email;
  delete value.role;

  const avatar = value.avatar;
  if (
    typeof avatar !== 'string' ||
    avatar.length > 500 ||
    (!avatar.startsWith('/uploads/') && !/^https:\/\//i.test(avatar))
  ) {
    value.avatar = '';
  }

  return value;
};

module.exports = { sanitizePublicUser };
