# Load and Stress Testing Plan

**Status: NOT RUN.** No load or stress test has been executed against production. Do not infer capacity from unit tests or browser smoke tests.

## Safety boundary

- Run load tests only against an isolated staging deployment with synthetic data and a dedicated database.
- The supplied k6 workflow refuses the known public production hostname.
- Start with 1 virtual user, then 2, then at most 5 for the initial baseline. Keep each run to two minutes.
- Do not test login, registration, uploads, email, admin mutations, or WebSocket fan-out in the baseline profile.
- Do not increase concurrency or duration without checking staging resource limits and obtaining explicit approval from the environment owner.
- Stop immediately if staging errors, latency, database saturation, or queue depth rise unexpectedly.

## Initial workload

The baseline script sends read-only GET requests to:
- `/api/v1/health`
- `/api/v1/posts` (public listing)

It records request rate, p50/p95/p99 latency, HTTP failures, and checks basic response success. It is a small baseline, not a capacity certification or denial-of-service test.

## Run from GitHub Actions

1. Configure repository variable `STAGING_BASE_URL` to the HTTPS origin of an isolated staging deployment. It must not point to the public production service.
2. Open **Actions → Staging read-only load baseline → Run workflow**.
3. Select 1, 2, or 5 virtual users and keep the default two-minute duration.
4. Review the k6 summary artifact/logs. A passing threshold means only that this small profile passed.

## Initial acceptance thresholds

- HTTP request failure rate below 1%.
- p95 response time below 1,000 ms for the tested read-only endpoints.
- No unexpected 5xx responses.
- No database CPU, memory, connection-pool, or provider-limit saturation.
- No sustained memory growth or restart during/after the run.

These are provisional engineering gates, not contractual SLOs. Set final targets after observing normal traffic and resource tiers.

## Follow-up scenarios (staging only)

After the baseline passes, design separately approved scenarios for authenticated article reads, search, pagination, comment reads, media delivery, and Socket.IO connection lifecycle. Use synthetic accounts and datasets. Avoid write-heavy workloads until idempotent cleanup and database reset procedures are proven.

Record commit SHA, staging build/version, environment tier, dataset size, VUs, duration, endpoint mix, thresholds, actual percentiles, errors, resource metrics, and conclusion for every run.
