const env = require('../config/env');

const isAllowedAvatar = (avatar) => {
  if (typeof avatar !== 'string' || avatar.length > 500) return false;
  if (/^\/uploads\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(avatar)) return env.NODE_ENV !== 'production';
  try {
    const url = new URL(avatar);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    if (['api.dicebear.com', 'lh3.googleusercontent.com', 'platform-lookaside.fbsbx.com', 'graph.facebook.com'].includes(host)) return true;
    return host === 'res.cloudinary.com' &&
      Boolean(env.CLOUDINARY_CLOUD_NAME) &&
      url.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
  } catch (_) {
    return false;
  }
};

/**
 * Public author projection used by post and comment responses.
 * Never serialize private account fields or legacy inline/oversized avatar data.
 */
const sanitizePublicUser = (user) => {
  if (!user) return user;
  const value = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete value.email;
  delete value.role;
  if (!isAllowedAvatar(value.avatar)) value.avatar = '';
  return value;
};

module.exports = { sanitizePublicUser, isAllowedAvatar };
