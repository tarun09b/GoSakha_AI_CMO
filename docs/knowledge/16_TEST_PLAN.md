# 16 — Test Plan

## Coverage matrix

| Layer | What's tested |
| --- | --- |
| Unit | Domain logic — lead scoring, temperature classification, claim-check matching, template personalization |
| API | Every endpoint in `07_API_SPEC.md` — success, validation error, permission error, not-found |
| Database | Schema constraints, dedup constraints, idempotency keys, migration up/down |
| Agent | Each agent in `04_AGENT_SPECIFICATIONS.md` — happy path, failure path, retry, mock-provider substitution |
| Integration | Provider adapters — auth failure, rate-limit handling, webhook signature verification, idempotent replay |
| Realtime | Event bus — publish/subscribe correctness, filter correctness, reconnect/backfill behavior |
| RBAC | Every role × every endpoint — allowed vs. denied matrix |
| Approval bypass | Attempt to execute a gated action without an approval record — must fail closed (see below) |
| Failure/retry | Agent run failure → alert → manual retry → success path |
| E2E dashboard | Full user journeys through the UI (see scenarios below) |
| Performance | Live event latency (<5s target), KPI rollup timing, dashboard load under realistic data volume |
| Security | Secret exposure scan, encryption verification, opt-out enforcement, prompt-injection resistance on any agent that ingests external content |

## Critical approval-bypass tests (must exist before any production rollout)
1. Attempt to send email via API without an `approved` approval record → expect rejection.
2. Attempt to publish LinkedIn/Instagram content without approval → expect rejection.
3. Attempt to launch a campaign without approval → expect rejection.
4. Attempt to send to a lead with `opt_out = true` → expect rejection regardless of approval state.
5. Attempt by a scoped agent service account to call an endpoint outside its documented tool set (`04_AGENT_SPECIFICATIONS.md`) → expect rejection + audit alert.

## E2E scenarios (map to Example End-to-End Hospital Journey)
1. Discover hospital → create account → research decision-maker → score lead → AI recommends outreach → generate email → approve → send → reply arrives → classify → update CRM stage → recommend demo → schedule → record outcome → update campaign attribution → analyze → AI recommends next action.
2. Trend discovered → digest generated → converted to content task → drafted → claim-checked → approved → published → metrics tracked.
3. Agent failure → alert fired → manual retry → success, all visible in Agent Center and Live Activity.

## Traceability
Every test maps back to a requirement row in `02_PRD.md`'s traceability matrix. QA is not complete until every PASS/PARTIAL/FAIL is recorded against that matrix (per the Phase 20 Full QA prompt in the master build plan).

## Exit criteria for each rollout stage
- **Mock → Internal:** all unit/API/agent tests pass on mock providers.
- **Internal → Approval-only:** RBAC + approval-bypass tests pass; real provider connected with a verified end-to-end test.
- **Approval-only → Limited automation:** 30+ days of approval-only operation with acceptable approval-to-execution accuracy, reviewed by a human.
- **Limited → Expanded automation:** performance and security test suites pass under production-like load; no unresolved critical defects.
