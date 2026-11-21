# Security and Quality Gates

This document describes the automated checks wired into GitHub Actions and the additional release activities that still require human review.

## Pull request and branch CI

| Layer | Tooling | What it checks | Gate |
|---|---|---|---|
| Frontend unit/component | Vitest, React Testing Library, JSDOM | React component behavior and UI regressions | Blocking |
| Backend unit | Vitest | JWT, password, validation and service behavior | Blocking |
| Backend integration/API | Vitest, Supertest, mongodb-memory-server | Auth, posts, comments, communities, admin, recovery, rate-limit routing and health endpoints | Blocking |
| Production build | Vite | Optimized frontend bundle compiles | Blocking |
| Browser smoke/E2E | Playwright + Chromium | Public shell, login/register routes and runtime page errors | Blocking |
| Accessibility | axe-core / Playwright | WCAG 2.0/2.1 A/AA; serious and critical findings block | Blocking |
| Production dependency audit | npm audit | High/critical advisories in runtime dependencies | Blocking |
| Development dependency audit | npm audit | Toolchain advisories surfaced for triage | Informational for now |
| Secret scanning | Gitleaks | Credentials accidentally committed in repository history | Blocking |
| PR dependency review | dependency-review-action | Newly introduced vulnerable dependencies | Blocking at high severity |
| Static application security | CodeQL | JavaScript/TypeScript security and quality queries | Security alert / review |
| Live availability smoke | Node.js built-in fetch | Production SPA routes and `/api/v1/health` | Blocking for that run |
| Passive DAST | OWASP ZAP Baseline | Passive security headers, exposed content and common web misconfiguration signals | Report artifact; not a certification |

CI runs on pushes to branches, pull requests targeting `main`, and manual dispatch. CodeQL runs on pushes and pull requests to `main`, plus a weekly schedule. The deployed smoke and passive ZAP baseline run manually and weekly against the explicitly authorized URL.

## Running checks locally

From the repository root:

```bash
npm run install:all
npm test
npm run build:client
npm run smoke:deployed
```

The deployed smoke script is intentionally restricted to `https://devlog-client-rq1y.onrender.com`. It checks the public SPA routes and the versioned API health response; it does not sign in or mutate application data.

To run browser checks locally:

```bash
cd client
npm ci
npm install --no-save --no-package-lock @playwright/test @axe-core/playwright
npx playwright install chromium
npm run build
npx playwright test --config=playwright.config.js
```

## VAPT and release assurance

Automated CI is not a full penetration test. ZAP Baseline is a passive scan and does not prove that the application is secure. Before calling a release production-ready, perform an authorized manual assessment covering at least:

- Authentication, password recovery, session expiry, refresh-token rotation and replay.
- Authorization across anonymous, standard-user, author and administrator roles.
- IDOR/BOLA and horizontal/vertical privilege escalation across posts, drafts, comments, saved items, uploads and community resources.
- NoSQL injection, stored/reflected XSS, CSRF, CORS and unsafe redirect handling.
- Rate-limit behavior, abuse resistance, enumeration and account lockout/recovery edge cases.
- File upload type/size/content validation, storage access controls and metadata handling.
- WebSocket authentication, room membership and event authorization.
- Security headers, cookie flags, TLS configuration, cache behavior and error leakage.
- Dependency, environment-variable, Render configuration, logging and secret-management review.
- Business-logic abuse and multi-account workflows.

Use dedicated test accounts and synthetic data. Obtain explicit approval before active testing. Do not perform destructive tests, brute force, stress/load tests or exploit attempts against the public production deployment. Use an isolated staging environment for active VAPT and load testing.

Record findings with severity, affected component, evidence, remediation, owner, retest result and residual risk. A green CI pipeline or a ZAP baseline report must never be described as a formal VAPT pass or security certification.

## Release checklist

- [ ] All blocking CI checks pass on the exact release commit.
- [ ] No unresolved critical/high security findings remain without an approved exception.
- [ ] Manual role/ownership and authentication checks pass in staging.
- [ ] Backup, restore and rollback procedures are verified.
- [ ] Production environment variables and provider callbacks are validated.
- [ ] Smoke tests pass after deployment.
- [ ] Accessibility is manually reviewed with keyboard and assistive technology.
- [ ] Monitoring, error reporting and incident contacts are configured.
