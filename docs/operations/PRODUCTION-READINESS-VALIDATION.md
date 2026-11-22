# Production Readiness Validation Record

**Repository:** `soumya100/blog-assignment`  
**Baseline commit assessed:** `d32936bba3eb2ed4c871817914be087b6ef0b797`  
**Assessment date:** 2026-11-22  
**Overall status:** IN PROGRESS — not a production-readiness certification.

This record separates automated evidence from provider-level and manual activities that still require access or an isolated staging environment.

## 1. VAPT

### Evidence completed

- GitHub Actions CI passed on the baseline commit, including backend integration/security tests, frontend tests/build, Playwright smoke/accessibility tests, production dependency audits and Gitleaks.
- CodeQL passed on the baseline commit.
- The deployed availability smoke passed:
  - Frontend `/`, `/login`, `/register`: HTTP 200.
  - Backend `/api/v1/health`: HTTP 200 with healthy JSON payload.
- OWASP ZAP Baseline passive scan completed against the authorized frontend:
  - 58 PASS checks.
  - 0 FAIL findings.
  - 10 WARN categories.
- ZAP warnings observed:
  - Cache-Control directives require review.
  - Missing anti-clickjacking header.
  - Suspicious comments in generated JavaScript bundles.
  - Missing Content-Security-Policy.
  - Storable/cacheable content.
  - Retrieved-from-cache signals.
  - Missing Permissions-Policy.
  - Modern web application informational signal.
  - Missing Subresource Integrity attributes.
  - Missing/invalid Cross-Origin-Embedder-Policy.

### Remediation in progress

The Render static-site Blueprint now defines a CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS and cache revalidation headers. The deployed smoke is being extended to verify these headers after a main-branch deployment.

The COEP and SRI warnings are not automatically treated as vulnerabilities: enabling COEP can break third-party resources, and SRI is not generally applicable to Vite's same-origin, content-hashed bundle graph. Generated bundle comments also require manual inspection before classifying them as disclosure.

### Still required

- Re-run ZAP after the header deployment and triage every remaining alert.
- Active testing only in an isolated staging environment with dedicated synthetic accounts.
- Manual authentication/session, RBAC/IDOR, NoSQL injection, XSS, CSRF, upload, WebSocket room authorization, rate-limit and business-logic testing.
- Retest all confirmed findings and record residual risks.

**VAPT status: NOT VERIFIED.** Passive ZAP and CI are not a full penetration test.

## 2. Complete production workflow validation

### Evidence completed

- CI integration suites exercise registration, login, refresh-token rotation/replay detection, password recovery/OTP, post CRUD and ownership, comments, community features and admin authorization against an isolated test database.
- Browser E2E tests exercise public shell rendering, login/register route rendering, direct route refresh, mobile viewport overflow and serious/critical accessibility checks.
- Deployed smoke confirms only public SPA routes and backend health.

### Still required

The live smoke does not authenticate or create/update/delete production data. Complete end-to-end validation must run against staging with dedicated test accounts and cover:

1. Registration, email verification/recovery, login, logout, refresh and expired-session behavior.
2. Reader browsing, search, reading progress/history, saves, reactions and comments/replies.
3. Author draft creation, editing, preview, publish/schedule, version history and unpublish/delete/restore.
4. Image upload, replacement, retrieval and deletion through Cloudinary.
5. Community/follow/mention/report and admin moderation workflows.
6. Newsletter subscription/unsubscription and delivery behavior.
7. Socket.IO authentication, post-room access and collaborative draft authorization.
8. OAuth callbacks if Google/Facebook OAuth is enabled in the deployed environment.
9. Error paths: unavailable SMTP, Redis, Cloudinary, MongoDB, malformed input, rate limiting and provider timeouts.

Record screenshots or test output with test account identifiers redacted. Never use real customer data for destructive tests.

**Production workflow status: NOT VERIFIED.** Existing automated tests are useful but do not prove every deployed integration works.

## 3. Backup and disaster recovery

The companion [Backup and Disaster Recovery Runbook](./BACKUP-AND-DISASTER-RECOVERY.md) defines a MongoDB dump, isolated restore drill, integrity checks and Cloudinary asset recovery requirements.

Repository configuration shows a free Render web-service plan. Treat its local filesystem as ephemeral; durable uploads are intended to use Cloudinary. The repository does not prove that Atlas automated backups/PITR, Cloudinary recovery/retention or an off-provider encrypted backup destination are enabled.

### Still required

- Confirm the actual MongoDB Atlas project/cluster and tier.
- Confirm provider-managed backups/PITR and retention settings.
- Approve RPO and RTO with the service owner.
- Confirm Cloudinary asset recovery/retention separately from MongoDB.
- Produce an encrypted backup outside the application filesystem.
- Restore it to an isolated temporary database and validate collections, indexes, relationships and application startup.
- Record backup/restore timestamps, checksums, duration, errors and operator.

**Backup and disaster recovery status: NOT VERIFIED.** A runbook is not evidence of a successful backup or restore.

## Release decision

Do not mark the application fully production-ready until all three workstreams have evidence, high/critical security findings are remediated or explicitly accepted, and a release commit passes the blocking CI and deployed checks.
