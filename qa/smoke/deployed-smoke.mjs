import process from 'node:process';

const frontendBaseUrl = (process.env.SMOKE_BASE_URL || 'https://devlog-client-rq1y.onrender.com').replace(/\/$/, '');
const apiBaseUrl = (process.env.SMOKE_API_BASE_URL || 'https://blog-assignment-ds1d.onrender.com').replace(/\/$/, '');
const allowedHosts = new Set([
  'devlog-client-rq1y.onrender.com',
  'blog-assignment-ds1d.onrender.com',
]);

function validateBaseUrl(value, label) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('Refusing to smoke-test an unapproved ' + label + ' target: ' + value);
  }
  return parsed;
}

const frontendBase = validateBaseUrl(frontendBaseUrl, 'frontend');
const apiBase = validateBaseUrl(apiBaseUrl, 'API');
if (frontendBase.hostname !== 'devlog-client-rq1y.onrender.com') {
  throw new Error('SMOKE_BASE_URL must point to the deployed DevLog frontend.');
}
if (apiBase.hostname !== 'blog-assignment-ds1d.onrender.com') {
  throw new Error('SMOKE_API_BASE_URL must point to the deployed DevLog API.');
}

async function request(base, path) {
  const url = new URL(path, base);
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
        headers: { 'user-agent': 'DevLog-deployment-smoke/1.0' },
      });
      console.log('attempt ' + attempt + ': ' + response.status + ' ' + url.pathname + ' -> ' + response.url);
      if (new URL(response.url).hostname !== base.hostname) {
        throw new Error('Unexpected cross-host redirect while checking ' + url.pathname);
      }
      if (response.status >= 500 && attempt < 10) {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 10) break;
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  }
  throw new Error('Deployment request failed after 10 attempts: ' + url.pathname + ': ' + (lastError?.message || 'HTTP 5xx'));
}

const frontendRoutes = ['/', '/login', '/register'];
for (const route of frontendRoutes) {
  const response = await request(frontendBase, route);
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error('Frontend route smoke failed for ' + route + ': HTTP ' + response.status + ', content-type=' + contentType);
  }
  const html = await response.text();
  if (!html.includes('id="root"') && !html.includes('id="app"')) {
    throw new Error('Expected SPA mount point was not found on ' + route);
  }
}

const frontendHeaders = await request(frontendBase, '/');
const requiredHeaders = [
  ['content-security-policy', (value) => value.includes("default-src 'self'") && value.includes("frame-ancestors 'none'")],
  ['x-frame-options', (value) => value.toLowerCase() === 'deny'],
  ['x-content-type-options', (value) => value.toLowerCase() === 'nosniff'],
  ['referrer-policy', (value) => value.toLowerCase() === 'strict-origin-when-cross-origin'],
  ['permissions-policy', (value) => value.includes('camera=()') && value.includes('microphone=()')],
  ['strict-transport-security', (value) => value.includes('max-age=31536000')],
  ['cache-control', (value) => value.toLowerCase().includes('no-cache')],
];
for (const [header, validate] of requiredHeaders) {
  const value = frontendHeaders.headers.get(header);
  if (!value || !validate(value)) {
    throw new Error('Missing or invalid frontend security header: ' + header + ' (received: ' + (value || 'missing') + ')');
  }
  console.log('security header verified: ' + header);
}

const health = await request(apiBase, '/api/v1/health');
const healthType = health.headers.get('content-type') || '';
if (!health.ok || !healthType.includes('application/json')) {
  throw new Error('API health route failed: HTTP ' + health.status + ', content-type=' + healthType + ', url=' + health.url);
}
let payload;
try {
  payload = await health.json();
} catch {
  throw new Error('API health route returned invalid JSON.');
}
if (payload?.success !== true || payload?.data?.status !== 'UP') {
  throw new Error('API health payload is not healthy: ' + JSON.stringify(payload));
}
console.log('Deployed smoke checks passed: frontend SPA routes, required frontend security headers and direct backend API health are responding.');
