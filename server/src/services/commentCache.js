const env = require('../config/env');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 30;
const VERSION_KEY_TTL_SECONDS = 86400 * 7; // 7 days

const request = async (command) => {
  if (!env.REDIS_REST_URL || !env.REDIS_REST_TOKEN) return null;
  try {
    const response = await fetch(env.REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(1200),
    });
    if (!response.ok) {
      logger.warn(`Redis REST HTTP ${response.status}: ${response.statusText}`);
      return null;
    }
    const payload = await response.json();
    if (payload.error) {
      logger.warn(`Redis command error: ${payload.error}`);
      return null;
    }
    return payload.result;
  } catch (error) {
    // Fail-open: Cache outages must never disrupt the discussion service
    logger.warn(`Redis connection failed: ${error.message}`);
    return null;
  }
};

const getJson = async (key) => {
  const value = await request(['GET', key]);
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    logger.warn(`Failed to parse cached JSON for key ${key}: ${err.message}`);
    return null;
  }
};

const setJson = async (key, value, ttl = CACHE_TTL_SECONDS) => {
  try {
    const serialized = JSON.stringify(value);
    return await request(['SET', key, serialized, 'EX', ttl]);
  } catch (err) {
    logger.warn(`Failed to serialize value for cache key ${key}: ${err.message}`);
    return null;
  }
};

const bumpVersion = async (postId) => {
  if (!postId) return null;
  const key = `comments:version:${postId}`;
  const result = await request(['INCR', key]);
  if (result) {
    // Keep version keys from accumulating indefinitely
    await request(['EXPIRE', key, VERSION_KEY_TTL_SECONDS]);
  }
  return result;
};

const getVersion = async (postId) => {
  if (!postId) return '0';
  const value = await request(['GET', `comments:version:${postId}`]);
  return value || '0';
};

module.exports = { getJson, setJson, bumpVersion, getVersion };
