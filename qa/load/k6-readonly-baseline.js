import http from 'k6/http';
import { check, sleep } from 'k6';

const base = (__ENV.STAGING_BASE_URL || '').replace(/\/$/, '');
if (!base) throw new Error('STAGING_BASE_URL is required');
const target = new URL(base);
if (target.protocol !== 'https:' || target.pathname !== '/' || target.search || target.hash) throw new Error('Load tests require an HTTPS origin without a path, query or fragment');
if (!target.hostname.startsWith('devlog-staging-') || !target.hostname.endsWith('.onrender.com') || target.hostname === 'devlog-client-rq1y.onrender.com' || target.hostname === 'blog-assignment-ds1d.onrender.com') {
  throw new Error('Refusing to load-test anything except the isolated devlog-staging-*.onrender.com environment');
}
if (__ENV.CONFIRM_STAGING !== 'true') {
  throw new Error('Set CONFIRM_STAGING=true only after confirming this is an isolated staging environment');
}

const vus = Number(__ENV.VUS || 1);
if (![1, 2, 5].includes(vus)) throw new Error('VUS must be 1, 2, or 5');

export const options = {
  vus,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const health = http.get(base + '/api/v1/health', { tags: { endpoint: 'health' } });
  check(health, { 'health returns 2xx': (r) => r.status >= 200 && r.status < 300 });

  const posts = http.get(base + '/api/v1/posts', { tags: { endpoint: 'public-posts' } });
  check(posts, { 'public posts returns 2xx': (r) => r.status >= 200 && r.status < 300 });

  sleep(1);
}
