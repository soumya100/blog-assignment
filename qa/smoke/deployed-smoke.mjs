import process from 'node:process';

const baseUrl = (process.env.SMOKE_BASE_URL || 'https://devlog-client-rq1y.onrender.com').replace(/\/$/, '');
const allowedHost = 'devlog-client-rq1y.onrender.com';
const parsedBase = new URL(baseUrl);
if (parsedBase.protocol !== 'https:' || parsedBase.hostname !== allowedHost) {
  throw new Error('Refusing to smoke-test an unapproved target: ' + baseUrl);
}

async function request(path) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'DevLog-deployment-smoke/1.0' },
  });
  console.log(response.status + ' ' + url.pathname + ' -> ' + response.url);
  return response;
}

for (const route of ['/', '/login', '/register']) {
  const response = await request(route);
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error('Frontend route smoke failed for ' + route + ': HTTP ' + response.status + ', content-type=' + contentType);
  }
  const html = await response.text();
  if (!html.includes('id="root"') && !html.includes('id="app"')) {
    throw new Error('Expected SPA mount point was not found on ' + route);
  }
}

const health = await request('/api/v1/health');
const healthType = health.headers.get('content-type') || '';
if (!health.ok || !healthType.includes('application/json')) {
  throw new Error('API health route failed: HTTP ' + health.status + ', content-type=' + healthType);
}
const payload = await health.json();
if (payload?.success !== true || payload?.data?.status !== 'UP') {
  throw new Error('API health payload is not healthy: ' + JSON.stringify(payload));
}
console.log('Deployed smoke checks passed: SPA routes and versioned API health are responding.');
