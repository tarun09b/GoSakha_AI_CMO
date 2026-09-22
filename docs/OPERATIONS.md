# GoSakha CMO operations

## Implemented in the dashboard

Hospital CRM, temperature and stage filters, campaign assignment, activity history, individual approvals with revision history, claim screening, email sequences with 2-day and 3-day follow-ups after confirmed delivery, reply classification from operator-entered notes, suppression, demo outcomes and next-day tasks, campaign activation and completion, reviewed plan delegation, source-backed research records, evidence-tagged engagement metrics, CSV export, contact archive and explicit erasure.

External adapters: Gmail send/thread reply detection; Google Calendar invitations; LinkedIn text publication; Instagram public-image preparation/publication; Claude structured plans; Brave public search. Provider operations are recorded in the durable agent_runs table. Missing credentials are shown as not connected. Credentials present is not the same as verified health. Sample mode blocks external publication and invitations.

## Connections

Configure server secrets with the Site's environment settings, then publish the configuration. Never paste tokens into workspace notes. All providers require valid account permissions. Google refresh tokens need Gmail and Calendar scopes for the operations enabled. LinkedIn and Meta versions are explicit settings because supported versions change. Instagram uses the Facebook Login Graph API route and requires an eligible professional account linked/configured for that API. It supports a public HTTPS single-image URL; videos, carousels and media hosting are not implemented.

Required settings are listed in the Integrations screen and .env.example. CMO_OWNER_USER_ID is the owner's authenticated ID (visible in the operations API to the signed-in user). CMO_TEAM_MEMBERS is an optional server-only JSON map of authenticated user IDs to CMO, Sales, Content Reviewer or Viewer. It does not share the Site or grant a new person Site access. Configure both Site access and explicit workspace membership when adding a team. Without an owner setting the current owner-private Site stores each authenticated user's own workspace separately.

Admin can change all workspace records. CMO can operate providers and review campaigns/emails; it cannot erase contact data or change team/security settings. Sales can maintain relationships, draft outreach, record replies, meetings and tasks; it cannot approve or send. Content Reviewer can author/review social posts. Viewer cannot mutate data. Secrets are not exposed by application routes.

## Scheduler

POST /api/automation accepts Authorization: Bearer AUTOMATION_SECRET and processes up to five due approved messages/posts, while checking Gmail replies first. Configure a trusted server scheduler (for example n8n) to call this endpoint every 5 minutes. Private Sites dispatch also requires its supported authenticated access: the application bearer secret alone does not grant access through the private host. Preserve the current private Site audience. Do not store dispatch credentials in browser code. No scheduler has been configured or run in production in this session.

A paused workspace does not send. Email sending enforces the daily cap and checks current approvals, opt-out state and preceding sequence delivery. Email thread metadata is synchronized, not entire inbox bodies. Operators classify replies in the dashboard, using manual categories or the deterministic Auto classifier. Instagram posts require a prepared media container before the scheduler can publish them.

## Ambiguous external outcomes

Provider timeouts can happen after an action was accepted. Email Delivery uncertain, post Publication uncertain and Invite uncertain states do not auto-retry. Reconcile directly against the provider before taking another outbound action. Existing record receipts and the agent run history provide evidence. Automated provider reconciliation/replay is not implemented. Stale Running rows appear as Needs investigation after two minutes.

## Measurement

Reply rate = provider-confirmed replied emails / provider-confirmed sends. Demo conversion = interested / completed outcomes. Engagement = likes + comments + shares divided by impressions from evidence-tagged manual metric entries; automatic social insights sync is not implemented. Pipeline velocity is median days between recorded stage transitions. Existing sample data has no invented transition history. Reporting period filters item activity by its creation timestamp; current lead inventory remains current. Campaigns attribute a lead's activity to its assigned campaign; this is single-campaign attribution, not a multichannel attribution model.

## Data handling and limits

Keep professional contacts only; no patient records or inbox body ingestion. Contact erasure removes the lead and directly linked items/events in the workspace. It does not erase sent provider messages, external calendar events, independent prose references in other documents/plans, service logs or backups. Those require separate handling. There is no automatic retention job or formal compliance certification. Claim screening is a deterministic gate for specified phrases and source IDs, not semantic verification or clinical validation.

Storage uses the hosting platform's D1, optimistic revision checks and a separate run log. It is not the original proposed Supabase/Postgres relational schema. Updates refresh every four seconds; SSE/WebSocket transport is not implemented. Built-in planning and reply classification are deterministic; Claude planning is enabled only with valid server credentials. Research results are labeled unverified sources, not fabricated contacts or measured trends. Automated LinkedIn/Instagram DMs, calling, full autonomous lead discovery and agent retries are outside this implementation.

## Verification before live launch

TypeScript and 32 targeted tests pass. Tests cover approvals, claim gates, delays, suppression, cap reservations, outcomes, attribution, erasure, role boundaries and mocked provider request contracts. Mocked provider tests do not prove API permissions or live delivery. Run one explicitly approved email, a controlled reply/opt-out, one calendar invite, and approved social test posts using real accounts; verify scheduler operation while the dashboard is closed. This session did not send any external messages or connect provider accounts.
