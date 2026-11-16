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
    (!/^\/uploads\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(avatar) && (() => { try { const url = new URL(avatar); return url.protocol !== 'https:' || !['res.cloudinary.com', 'api.dicebear.com'].includes(url.hostname.toLowerCase()) || Boolean(url.username || url.password); } catch (_) { return true; } })())
  ) {
    value.avatar = '';
  }

  return value;
};

module.exports = { sanitizePublicUser };
