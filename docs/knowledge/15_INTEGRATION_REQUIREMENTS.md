# 15 — Integration Requirements

All integrations built as provider-agnostic adapters. Sequence: mock adapter first → real provider connected one at a time → end-to-end test required before any "connected" claim.

| Provider | Purpose | Auth/Scopes | Health check | Notes |
| --- | --- | --- | --- | --- |
| Gmail API | Inbox sync, send, reply tracking | OAuth2, read + send scopes only (minimum necessary) | Token validity + last successful sync timestamp | Never store raw credentials client-side |
| Google Calendar | Demo scheduling | OAuth2, calendar read/write scope | Last successful booking | Used by CRM Agent's demo workflow |
| LinkedIn (supported APIs) | Post scheduling/publishing, DM where supported | Per LinkedIn developer terms | Connection + rate-limit status | No scraping or unsupported automation |
| Meta / Instagram (supported APIs) | Content calendar, publishing, DM/comment status | Per Meta Graph API terms | Connection + rate-limit status | Business account required |
| n8n | Cross-agent workflow orchestration, scheduled rollups | Internal service auth | Workflow run success rate | Owns scheduled jobs (hourly/daily rollups) |
| PostgreSQL / Supabase | System of record | Service-role credentials, scoped per service | Connection pool health | Primary DB per `06_DATABASE_SCHEMA.md` |
| Claude API | AI CMO Brain planning, drafting, classification | API key via provider adapter | Latency + error rate | Structured outputs used for plans/decisions |
| Notification/email provider | Alerting (approvals, failures, hot leads) | Provider API key | Delivery success rate | Separate from Gmail Agent (internal alerts, not outreach) |
| Analytics | Dashboard/report metrics pipeline | Internal | Rollup job success | Feeds Analytics/Reports module |

## Per-provider requirements template
For each provider define: auth method, scopes requested (minimum necessary), connection status states, health-check cadence, rate limits observed, error taxonomy, retry policy, webhook signature verification, audit logging of connect/disconnect events.

## Webhook handling
- All inbound webhooks (Gmail push, LinkedIn/Meta callbacks) verify signature before processing.
- Idempotency enforced via provider-supplied event IDs (see `06_DATABASE_SCHEMA.md` unique constraints).
- Failed webhook processing retries with backoff; permanent failures surface in Agent Center, not silently dropped.

## Connection lifecycle (shown in Integrations module)
`Not connected → Connecting → Connected → Degraded (rate-limited/expiring) → Disconnected/Error`

Every state transition is an audit-logged event.
