const env = require('../config/env');

const CACHE_TTL_SECONDS = 30;
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
    if (!response.ok) throw new Error(`Redis REST returned ${response.status}`);
    const payload = await response.json();
    return payload.result;
  } catch (error) {
    // Cache outages must never make the discussion API unavailable.
    return null;
  }
};

const getJson = async (key) => {
  const value = await request(['GET', key]);
  if (typeof value !== 'string') return null;
  try { return JSON.parse(value); } catch (_) { return null; }
};

const setJson = async (key, value, ttl = CACHE_TTL_SECONDS) =>
  request(['SET', key, JSON.stringify(value), 'EX', ttl]);

const bumpVersion = async (postId) => {
  const result = await request(['INCR', `comments:version:${postId}`]);
  return result;
};

const getVersion = async (postId) => {
  const value = await request(['GET', `comments:version:${postId}`]);
  return value || '0';
};

module.exports = { getJson, setJson, bumpVersion, getVersion };
