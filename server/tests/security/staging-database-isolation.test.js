const { validateStagingMongoTarget } = require('../../src/config/database');

describe('staging MongoDB target isolation', () => {
  const stagingUri = 'mongodb+srv://staging-user:encoded-password@cluster.staging.mongodb.net/devlog_staging_ci?retryWrites=true';
  const expectedDatabase = 'devlog_staging_ci';
  const expectedHost = 'cluster.staging.mongodb.net';

  it('accepts only the configured staging host and staging database', () => {
    expect(validateStagingMongoTarget(stagingUri, expectedDatabase, expectedHost)).toBe(true);
  });

  it('rejects a production or otherwise unexpected Atlas hostname', () => {
    expect(() => validateStagingMongoTarget(
      'mongodb+srv://user:password@cluster.production.mongodb.net/devlog_staging_ci',
      expectedDatabase,
      expectedHost
    )).toThrow(/Staging MongoDB target mismatch/);
  });

  it('rejects a non-staging database name even on the staging cluster', () => {
    expect(() => validateStagingMongoTarget(
      'mongodb+srv://user:password@cluster.staging.mongodb.net/devlog',
      'devlog',
      expectedHost
    )).toThrow(/STAGING_DB_NAME with the devlog_staging_ prefix/);
  });

  it('rejects a URI whose database does not match the configured staging database', () => {
    expect(() => validateStagingMongoTarget(
      'mongodb+srv://user:password@cluster.staging.mongodb.net/devlog_staging_other',
      expectedDatabase,
      expectedHost
    )).toThrow(/Staging MongoDB target mismatch/);
  });
});
