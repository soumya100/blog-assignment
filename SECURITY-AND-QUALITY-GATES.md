# Security and Quality Gates

This repository's CI pipeline runs the following automated checks for pushes to the feature branch and pull requests targeting `main`.

## Automated checks

- **Regression:** Vitest frontend tests and Jest backend unit/integration/security tests.
- **Smoke:** Playwright checks the built frontend's home, login, and registration routes; Supertest checks both API health routes.
- **Accessibility:** axe-core scans the public home, login, and registration routes against WCAG 2.0/2.1 A/AA rules. Critical and serious violations fail CI.
- **Dependency security:** `npm audit --audit-level=high` runs independently for client and server dependencies.
- **Secret exposure:** Gitleaks scans repository history for committed secrets.
- **Build:** Vite production build must complete successfully.

## VAPT scope and limitations

These are repeatable CI security gates, not a certification or a substitute for a complete Vulnerability Assessment and Penetration Test. The existing backend security tests cover selected cases such as NoSQL injection, forged JWT rejection, security headers, malformed JSON handling, and unauthorized CORS origins.

A release VAPT should additionally include authenticated and unauthenticated testing of every API route, IDOR/BOLA and privilege-escalation attempts across users/roles, session and refresh-token lifecycle abuse, CSRF/CORS validation in the deployed topology, rate-limit bypass attempts, upload/input abuse, dependency and container/hosting configuration review, TLS and HTTP-header verification, and manual business-logic testing. Test only an explicitly authorized staging/production target.

## Release verification still requiring a deployed environment

- Verify login, logout, refresh, registration, password recovery, and OAuth with the configured providers.
- Verify draft create/edit/delete/publish and saved-article ownership with two distinct accounts.
- Verify admin-only pages and APIs with non-admin and anonymous accounts.
- Verify mobile/tablet layouts and keyboard-only navigation with real browsers and assistive technology.
- Run an authenticated DAST/VAPT against the deployed environment and retain the report, evidence, severity, remediation, and retest results.

Do not describe the application as VAPT-passed solely because CI is green.
