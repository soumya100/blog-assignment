import process from 'node:process';

const PRODUCTION_HOSTS = new Set([
  'devlog-client-rq1y.onrender.com',
  'blog-assignment-ds1d.onrender.com',
]);

function readStagingOrigin(value, label) {
  if (!value) throw new Error(`Missing ${label}. Configure it in the GitHub staging environment.`);
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !url.hostname.endsWith('.onrender.com') ||
    !url.hostname.startsWith('devlog-staging-') ||
    PRODUCTION_HOSTS.has(url.hostname)
  ) {
    throw new Error(`Refusing unsafe ${label}; expected an HTTPS devlog-staging-*.onrender.com origin.`);
  }
  return url;
}

const frontend = readStagingOrigin(process.env.STAGING_FRONTEND_URL, 'STAGING_FRONTEND_URL');
const api = readStagingOrigin(process.env.STAGING_API_URL, 'STAGING_API_URL');
if (frontend.hostname === api.hostname) {
  throw new Error('Staging frontend and API must be separate Render services.');
}

async function get(origin, path, expectedType) {
  const target = new URL(path, origin);
  const response = await fetch(target, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'DevLog-staging-smoke/1.0' },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`Unexpected redirect from ${target.href}; redirects are disabled to prevent cross-environment checks.`);
  }
  if (!response.ok) throw new Error(`${target.href} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes(expectedType)) {
    throw new Error(`${target.href} returned unexpected content-type: ${contentType}`);
  }
  return response;
}

for (const path of ['/', '/login', '/register']) {
  const response = await get(frontend, path, 'text/html');
  const html = await response.text();
  if (!html.includes('id="root"') && !html.includes('id="app"') && !html.includes('id="main-content"')) {
    throw new Error(`SPA mount point missing from staging route ${path}`);
  }
  console.log(`PASS staging frontend ${path}`);
}

const directHealth = await get(api, '/api/v1/health', 'application/json');
const directPayload = await directHealth.json();
if (directPayload?.success !== true || directPayload?.data?.status !== 'UP') {
  throw new Error('Staging API health payload is not healthy.');
}
console.log('PASS direct staging API health');

const proxiedHealth = await get(frontend, '/api/v1/health', 'application/json');
const proxiedPayload = await proxiedHealth.json();
if (proxiedPayload?.success !== true || proxiedPayload?.data?.status !== 'UP') {
  throw new Error('Frontend /api proxy did not reach the staging API health endpoint.');
}
console.log('PASS staging frontend proxy routes to healthy staging API');
