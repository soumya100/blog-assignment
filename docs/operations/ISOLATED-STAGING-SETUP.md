# Isolated Staging Environment Setup

**Do not use automatic Render PR previews for active testing until their environment-variable and database isolation has been independently verified.** The staging setup below is a separate pair of Render services and a separate data plane.

## 1. Provision the separate Render services

1. In Render, create a Blueprint from this repository and select `render.staging.yaml` (not `render.yaml`).
2. Review the plan and generated service names before approving creation. The intended services are `devlog-staging-api` and `devlog-staging-client`.
3. If Render assigns a different API hostname, update the frontend rewrite destination and `VITE_SOCKET_URL` in `render.staging.yaml` to that exact staging API hostname before deploying the static site.
4. Keep production services and the production Blueprint unchanged.

The staging Blueprint deliberately uses `sync: false` for credentials. Supply values only from the dedicated staging environment; never copy production values.

## 2. Provision isolated dependencies before the first staging deploy

- **MongoDB:** use a separate staging Atlas cluster and a least-privilege staging credential. Set `STAGING_MODE=true`, `STAGING_MONGODB_HOST` to the exact Atlas hostname, and `STAGING_DB_NAME` to a name beginning `devlog_staging_`. The API refuses to connect if the URI host or database does not match these values. Populate synthetic test data only. Do not use a production URI or production dump.
- **JWT/cookies:** generate three independent staging-only secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`.
- **Cloudinary:** use a separate test account or separately permissioned staging credentials/folder. Verify that staging cannot overwrite or delete production assets.
- **Redis:** if enabled, use a separate staging instance/database and credential. Do not reuse production Redis/session state.
- **Email:** use a sink/test inbox or provider sandbox; do not allow staging to send to real users.
- **OAuth:** use separate OAuth applications and staging callback URLs, or leave OAuth disabled in staging.
- **WebSockets:** use the staging API origin and staging frontend origin only.

Do not deploy until all required API variables are set and the MongoDB/Cloudinary/Redis/email isolation checks are complete. Render's `sync: false` prompts are not evidence that a supplied credential is isolated.

## 3. Configure the GitHub staging environment

Create a GitHub Environment named `staging`. Add these environment-scoped values:

| Name | Type | Purpose |
|---|---|---|
| `STAGING_FRONTEND_URL` | Variable | Exact HTTPS origin of the staging static site |
| `STAGING_API_URL` | Variable | Exact HTTPS origin of the staging API |
| `STAGING_E2E_EMAIL` | Secret | Dedicated synthetic test account |
| `STAGING_E2E_PASSWORD` | Secret | Password for that synthetic account |

Use the exact hostnames Render assigned. The workflows reject production hostnames and require the `devlog-staging-*.onrender.com` naming convention. Configure environment reviewers/approval if available.

## 4. Run verification in order

1. Confirm the API health endpoint directly: `/api/v1/health`.
2. Manually run **Isolated staging smoke**. It checks frontend routes, direct API health, and the frontend `/api` rewrite. The proxy check is important: it verifies that the staging frontend reaches the staging API.
3. Manually run **Authenticated staging Playwright**. It signs in with the dedicated synthetic account and checks that the session survives a reload.
4. Manually run **Staging read-only load baseline** only after the above checks pass. It is deliberately small (1, 2, or 5 virtual users) and performs GET requests only.
5. Save workflow run URLs and sanitized reports as evidence. Never upload database dumps, cookies, passwords, or tokens as artifacts.

All three staging workflows are manual and use the GitHub `staging` environment. They must not be repointed at production.

## 5. Preview and production safeguards

- Automatic Render PR previews are currently enabled on the production services. Do not treat them as staging; do not use them for authenticated, destructive, load, or security testing.
- The production smoke workflow and production ZAP baseline remain production-only. ZAP baseline is passive and is not an independent VAPT.
- Do not change production service environment variables, database credentials, OAuth callbacks, Cloudinary configuration, or Render plans as part of staging setup.
- A staging deployment is not proof of isolation. Record evidence that the staging DB, media, Redis, email and OAuth integrations are separate before authorizing any active VAPT.

## 6. Remaining provider and assurance evidence

The repository cannot verify Atlas backup/PITR settings or Cloudinary recovery settings. Obtain provider-side evidence, complete an encrypted backup and isolated restore drill, measure RPO/RTO, and validate media recovery. The requested RTO is one hour and remains unproven until a timed restore-and-cutover exercise demonstrates it.

Independent VAPT requires written authorization and an agreed scope from the independent tester. Test only the isolated staging target and attach the final report plus remediation/retest evidence to issue #45.
