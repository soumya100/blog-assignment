# Repository profile and branch protection setup

The GitHub connector used for this change can update repository files and pull requests, but it does not expose write operations for the repository About panel or branch-protection rules. Use the following values in GitHub Settings after reviewing this PR.

## About panel

- **Website:** https://devlog-client-rq1y.onrender.com/
- **Description:** DevLog is a full-stack MERN publishing and community platform built with React, Express, MongoDB and Socket.IO, featuring JWT authentication, role-based access, real-time discussions, reader tools and automated quality/security checks.
- **Topics:** `mern-stack`, `react`, `nodejs`, `express`, `mongodb`, `socket-io`, `blog-platform`, `publishing-platform`, `vitest`, `playwright`, `owasp`, `github-actions`

Open the repository home page, select the gear icon beside **About**, enter the Website and Description, add the topics, and save.

## Protect the main branch

After the first complete PR run has finished, open **Settings → Branches → Add branch protection rule** (or the repository rulesets page) and target `main`.

Recommended settings:

- Require a pull request before merging.
- Require the status checks below before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes and branch deletion.
- For a single-maintainer repository, keep required approvals at zero if self-approval would otherwise block every merge; add an independent reviewer when available.

Required checks to select from GitHub's check picker:

- `Frontend unit and regression tests`
- `Backend unit, integration, API and security tests`
- `Browser E2E smoke and accessibility`
- `Dependency and secret security checks`
- `Pull request dependency review`
- `Analyze JavaScript and TypeScript` (CodeQL)

Do not make the scheduled deployed smoke or ZAP baseline a required PR check: it runs on a schedule/manual dispatch and is not part of every pull request.

## Deployment

The current public frontend URL is https://devlog-client-rq1y.onrender.com/. The deployed smoke job checks this exact host and the proxied `/api/v1/health` endpoint. Review its first manual run and confirm the backend proxy is healthy before treating the monitor as operational.

OWASP ZAP Baseline is a passive scan only. Active VAPT, authenticated security testing, and load testing require an isolated staging environment and explicit authorization.
