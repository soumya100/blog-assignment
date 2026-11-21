# Security Policy

## Supported deployment

The currently published application is available at:

- https://devlog-client-rq1y.onrender.com/

Security testing against this deployment is limited to the passive, low-impact automated baseline configured in GitHub Actions. Do not run intrusive scans, brute-force tests, destructive payloads, or load tests against production.

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in public issues. Use GitHub's private vulnerability reporting feature when it is enabled for this repository, or contact the repository maintainer privately through the contact information on the GitHub profile.

Include:
- affected route/component and environment;
- impact and realistic attack scenario;
- reproducible steps and sanitized proof of concept;
- suggested mitigation, if known.

Do not include real user data, credentials, session cookies, access tokens, or secrets in a report.

## Scope and authorization

Only systems owned by the repository maintainer or explicitly authorized for testing are in scope. The deployed URL above is authorized for the scheduled passive ZAP baseline and availability smoke checks only. Active exploitation and authenticated VAPT require a separately approved test window.
