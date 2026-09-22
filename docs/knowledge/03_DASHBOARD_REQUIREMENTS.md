# 03 — Dashboard Requirements

Full visual spec (wireframe, tokens, drill-down behavior) is published as an artifact: **GoSakha Command Center — Dashboard Specification**. This file is the text/data reference version for the Claude Project knowledge base.

## Layout — four persistent zones
- **Top bar** (all screens): Command Center KPI strip, global search, filters (agent/product/lead temperature/source/date range/hospital), notification bell, approvals badge.
- **Left nav** (all screens): every module listed in `02_PRD.md` §2.
- **Main column**: module-specific content. On Command Center home: Hot Leads panel → Live Activity Stream → Pipeline snapshot → Demos this week.
- **Right rail** (persists across modules): Approvals Queue, Agent health chips (10 agents), AI CMO top-3 recommendations, trend digest teaser.

## Command Center KPIs

| Metric | Definition | Refresh | Drill-down |
| --- | --- | --- | --- |
| Hot / Warm / Cool leads | Count by temperature tier | Live | Leads list filtered by temperature |
| Weekly email reply rate | Replies ÷ delivered, trailing 7d | Hourly | Email Communication Status |
| LinkedIn engagement rate | (Likes+comments+shares) ÷ impressions, 7d | Hourly | LinkedIn Agent screen |
| Demo conversion rate | Won/interested ÷ completed demos | On outcome event | Demos & Meetings |
| Pipeline velocity | Median days per stage transition, 30d | Daily | CRM funnel |
| Pending approvals | Count by type | Live | Approvals Queue |
| Agent failures | Failed runs, trailing 24h | Live | Agent Center |
| Overdue tasks | Follow-ups past due | Daily + live on creation | CRM task list |
| Top campaign/channel | Best conversion among active campaigns | Daily | Campaign Intelligence |

Rule: a metric with zero underlying events shows "No data yet," never a misleading 0%.

## Live Activity Stream
Reverse-chronological feed from the typed event bus. Item fields: timestamp, actor, event type, entity, status, message, correlation ID.

Event catalog: `LEAD_FOUND, LEAD_QUALIFIED, HOSPITAL_UPDATED, EMAIL_DRAFT_CREATED, EMAIL_APPROVAL_REQUESTED, EMAIL_SENT, EMAIL_REPLY_RECEIVED, FOLLOWUP_CREATED, FOLLOWUP_SENT, LINKEDIN_SCHEDULED, LINKEDIN_PUBLISHED, INSTAGRAM_SCHEDULED, INSTAGRAM_PUBLISHED, DEMO_BOOKED, DEMO_COMPLETED, DEMO_NO_SHOW, CRM_STAGE_CHANGED, CAMPAIGN_STARTED, CAMPAIGN_COMPLETED, TREND_FOUND, AI_PLAN_CREATED, AI_APPROVAL_REQUESTED, WORKFLOW_STARTED, WORKFLOW_COMPLETED, WORKFLOW_FAILED`.

Objection-handling replies render with a distinct visual treatment (needs-review tag) so they don't blend into routine sent/delivered activity.

## Leads & Pipeline
Stages: `New → Contacted → Interested → Demo → Proposal → Negotiation → Won/Lost`

Temperature tiers:
- **Hot** — immediate action required, daily review. Triggers: high score, positive reply, demo requested, manual escalation.
- **Warm** — engaged, progressing, weekly review.
- **Cool** — early stage, monitored only.

Fields: source, organization & contact, score (0–100), stage, temperature, owner, last activity, next action + due date, opt-out state.

## Agent Health & Activity
Common model: `Healthy | Running | Waiting | Failed | Disabled` + current task, queue, last run, latency, retries, provider health.

Module-specific metrics per agent are detailed in `04_AGENT_SPECIFICATIONS.md`.

## Demos & Meetings
Upcoming: time, hospital/contact, participant, product focus, calendar link.
Completed: outcome (interested / objection / lost), notes, next action.

## Email Communication Status
Funnel: Sent → Delivered → Opened → Replied → Bounced, by campaign or time period.

## In-Mail & Message Threads
LinkedIn InMail/message status + drafts pending approval. Instagram DM/comment status. Email reply classification: positive / objection / no reply.

## Products & Services
Status (Live / In development / Deprecated), segment targeting, performance (leads/demos attributed, campaigns using it, conversion rate).

## Approvals Queue
Types: email send, LinkedIn post/DM, Instagram post/DM reply, campaign launch, sensitive health claim, high-value/bulk outreach, AI recommendation. Each shows target, proposed content, agent, source facts, reason, risk, time. Actions: Approve / Edit / Reject / Revise — all logged to Audit Log.

## Real-time & filtering
- Live push (WebSocket/SSE): activity feed, approvals badge, agent status — target <5s latency.
- Hourly rollup: rate-based KPIs.
- Daily rollup: velocity, top campaign (plus live nudge on stage change).
- Global filters: agent, product, lead temperature, source, date range, hospital/account.
- Drill-down: every KPI/card expands inline (slide-over or panel), preserving filter context — never a full navigation away.

## Priority ordering (what leaders see first)
1. Approvals queue & hot leads
2. Agent failures/errors
3. Live Activity Stream
4. Pipeline & demo conversion
5. Email/LinkedIn/Instagram status
6. Products & campaign performance
7. Trends digest
