const { spawnSync } = require('node:child_process');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '../..');
const runEnvValidation = (overrides) => spawnSync(
  process.execPath,
  ['-e', "const env = require('./src/config/env'); env.validateProductionConfig();"],
  {
    cwd: serverRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      RENDER: '',
      JWT_ACCESS_SECRET: 'A'.repeat(48),
      JWT_REFRESH_SECRET: 'B'.repeat(48),
      COOKIE_SECRET: 'C'.repeat(48),
      CLOUDINARY_CLOUD_NAME: 'devlog-test-cloud',
      CLOUDINARY_API_KEY: '123456789012345',
      CLOUDINARY_API_SECRET: 'cloudinary-test-secret',
      ...overrides,
    },
  }
);

describe('production environment configuration', () => {
  it.each(['Production', 'prod', 'staging'])(
    'refuses unsupported NODE_ENV value "%s" instead of silently enabling development behavior',
    (nodeEnv) => {
      const result = runEnvValidation({ NODE_ENV: nodeEnv });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Invalid NODE_ENV');
    }
  );

  it('rejects the public placeholder secrets previously shipped in .env.example', () => {
    const result = runEnvValidation({
      JWT_ACCESS_SECRET: 'super_secure_access_secret_change_in_production_key_123456789',
      JWT_REFRESH_SECRET: 'super_secure_refresh_secret_change_in_production_key_987654321',
      COOKIE_SECRET: 'super_cookie_secret_change_me_in_production_34982347',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unsafe production configuration');
    expect(result.stderr).toContain('JWT_ACCESS_SECRET');
    expect(result.stderr).toContain('JWT_REFRESH_SECRET');
    expect(result.stderr).toContain('COOKIE_SECRET');
  });

  it('accepts valid independent production secrets and configured persistent storage', () => {
    const result = runEnvValidation({});
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
