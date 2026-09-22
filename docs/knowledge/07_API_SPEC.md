# 07 — API Spec (endpoints & events)

All endpoints are typed, RBAC-scoped, and return errors as `{code, message}`. Base path `/api/v1`.

## Organizations / Hospitals
- `GET /organizations` — list, filterable by type/segment/status
- `GET /organizations/:id` — profile, contacts, activity timeline
- `POST /organizations` / `PATCH /organizations/:id`

## Leads
- `GET /leads?temperature=&stage=&source=&owner=` — filtered list
- `GET /leads/:id`
- `POST /leads` (agent- or user-created)
- `PATCH /leads/:id` (stage, owner, next action, opt_out)

## Email
- `GET /email/threads/:id`
- `POST /email/drafts` — create draft
- `POST /email/drafts/:id/submit-approval`
- `POST /email/drafts/:id/send` — requires prior approval
- `POST /webhooks/gmail` — inbound reply/delivery/bounce events (idempotent)

## Social (LinkedIn / Instagram)
- `POST /social/posts` — create draft
- `POST /social/posts/:id/submit-approval`
- `POST /social/posts/:id/schedule`
- `POST /webhooks/linkedin`, `POST /webhooks/meta` — inbound engagement/publish confirmation

## Content Studio
- `POST /content` — create draft with source facts
- `POST /content/:id/claim-check`
- `GET /content/:id/versions`

## CRM / Demos
- `PATCH /leads/:id/stage`
- `POST /demos` / `PATCH /demos/:id` (outcome, notes)
- `GET /tasks?owner=&status=&overdue=`

## Campaigns
- `POST /campaigns` / `PATCH /campaigns/:id`
- `GET /campaigns/:id/metrics`

## Trends
- `GET /trends?category=&since=`
- `POST /trends/:id/convert-to-task`

## AI CMO Brain
- `POST /ai/plan` — trigger planning cycle
- `GET /ai/decisions?status=`
- `POST /ai/decisions/:id/evaluate-outcome`

## Approvals
- `GET /approvals?status=pending&type=`
- `POST /approvals/:id/decision` — body: `{action: approve|reject|revise, edited_content?, reason?}`

## Agent Center
- `GET /agents` — health summary, all agents
- `GET /agents/:name/runs?status=`
- `GET /agents/:name/runs/:run_id` — full run detail
- `POST /agents/:name/runs/:run_id/retry`

## Live Events (realtime)
- `GET /events?since=&agent=&hospital=&status=` — paginated backfill
- `WS /events/stream` — live push, filterable by the same query params
- Event envelope: `{event_id, type, timestamp, actor, entity, status, message, metadata, correlation_id, workflow_run_id}`

## Audit
- `GET /audit?actor=&entity_type=&since=`

## Settings / Integrations
- `GET/PATCH /settings/{brand-voice|ai-rules|approval-rules|notifications|security}`
- `GET /integrations` — status, scopes, last health check
- `POST /integrations/:provider/health-check`

## Auth
- Standard session/JWT auth; every request carries the acting user or agent identity; agent-to-API calls use scoped service credentials, never a shared admin key.
