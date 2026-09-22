# 02 — Product Requirements Document

## 1. Users & Roles

| Role | Access | Key actions |
| --- | --- | --- |
| Admin | Full | Manage users, settings, approval rules, integrations |
| CMO / Marketing Lead | Full operational | Review AI plans, approve outreach/content, run campaigns |
| Sales / Outreach Operator | Scoped | Work leads, action demos, respond in CRM |
| Content Reviewer | Scoped | Approve/reject/edit content drafts, claim checks |
| Viewer (Leadership) | Read-only | Command Center, Analytics, Reports |

Permissions are enforced by RBAC (see `14_SECURITY_PRIVACY.md`). Every role's allowed actions map to a specific set of API endpoints (`07_API_SPEC.md`).

## 2. Core Modules (map to dashboards)

Command Center · Live Activity · Hospitals/Accounts · Products/Services · Leads · Gmail Agent · Email Outreach Agent · LinkedIn Agent · Instagram/Social Agent · Healthcare Content Studio · CRM/Pipeline · Demos/Meetings · Campaigns · Trends Agent · Campaign Intelligence · AI CMO Brain · Approvals · Analytics/Reports · Agent Center · Integrations · Audit Log · Settings.

Full field-level requirements for the dashboard layer live in `03_DASHBOARD_REQUIREMENTS.md`.

## 3. Core Workflows (see `05_WORKFLOW_CATALOG.md` for full detail)

1. Lead discovery → scoring → CRM entry
2. Outreach drafting → approval → send → reply handling → follow-up
3. Content drafting → claim check → approval → publish (LinkedIn/Instagram)
4. Demo booking → completion → outcome → CRM stage update
5. Campaign creation → attribution → performance analysis
6. AI CMO Brain daily planning cycle
7. Approval routing for any outbound/high-impact action
8. Trend discovery → digest → converted to task

## 4. States & Events

Every entity (lead, thread, post, demo, campaign, approval, agent run) has an explicit state machine. Every state transition emits a typed event to the event bus (full catalog in `03_DASHBOARD_REQUIREMENTS.md` §Live Activity and `07_API_SPEC.md`).

Example — Lead pipeline states: `New → Contacted → Interested → Demo → Proposal → Negotiation → Won | Lost`
Example — Approval states: `Pending → Approved | Rejected | Revised → Executed | Cancelled`
Example — Agent run states: `Healthy | Running | Waiting | Failed | Disabled`

## 5. Database Entities

See `06_DATABASE_SCHEMA.md` for full schema. Top-level entities: Organizations/Hospitals, Contacts, Products/Services, Knowledge Documents, Leads, Lead Activities, Email Threads/Messages/Drafts, Social Accounts/Posts/Metrics, Content, Campaigns/Metrics, Demos/Meetings, Tasks/Follow-ups, Agent Runs/Tasks, Live Events, AI Plans/Decisions, Approvals, Notifications, Integrations, Audit Logs, Users/Roles/Permissions, Settings/Brand/Approval Rules.

## 6. Permissions Model
RBAC with least-privilege defaults. Every write action is attributable to a user or an agent (never anonymous). Agent-originated writes carry an `agent_id` and, where applicable, a `run_id` for traceability.

## 7. Integrations
Gmail, Google Calendar, LinkedIn (supported APIs only), Meta/Instagram (supported APIs only), n8n, PostgreSQL/Supabase, Claude API, a notification/email provider, analytics. Full requirements in `15_INTEGRATION_REQUIREMENTS.md`.

## 8. Security
RBAC, secret management, encryption at rest/in transit, audit logging, retention/deletion policy, opt-out enforcement, prompt-injection and tool-authorization protection. Full detail in `14_SECURITY_PRIVACY.md`.

## 9. Observability
Structured logs, health checks, agent run detail (trigger, input summary, steps, provider calls, output, events — never secrets), live event stream with correlation IDs.

## 10. Errors
Every user-facing error explains what happened and what to do next, in the interface's voice (no apology, no vagueness). Every agent failure is visible in Agent Center with retry.

## 11. Test Requirements
Unit, API, database, agent, integration, realtime, RBAC, approval-bypass, failure/retry, E2E dashboard, performance, security. Full plan in `16_TEST_PLAN.md`.

## 12. Requirement Traceability Matrix (template)

| Req ID | Requirement | UI | Backend/API | DB entity | Test |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Hot leads visible on Command Center | Command Center KPI tile + drill-down | `GET /leads?temperature=hot` | `leads` | `test_hot_leads_kpi.spec` |
| REQ-002 | Outbound email requires approval before send | Approvals Queue | `POST /approvals/:id/decision` | `approvals`, `email_drafts` | `test_email_approval_gate.spec` |
| REQ-003 | Every agent action emits a live event | Live Activity Stream | Event bus publisher | `live_events` | `test_event_emission.spec` |
| … | *(populate per requirement as build proceeds)* | | | | |

This matrix is the living source of truth referenced by the Phase 20 QA prompt and the Phase 21 rollout gate.
