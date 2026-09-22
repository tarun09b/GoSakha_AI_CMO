# 05 — Workflow Catalog

Each workflow lists: trigger → steps → states → resulting events → approval gate (if any).

## WF-1 — Lead Discovery
- **Trigger:** AI CMO Brain plan step, or manual "find leads" request.
- **Steps:** Lead Intelligence Agent takes segment/geo/org-type/product → discovers orgs → researches org data → identifies decision-makers → validates contact data → deduplicates → creates/scores lead → creates next action.
- **States:** `researching → validated → created`
- **Events:** `LEAD_FOUND → LEAD_QUALIFIED`
- **Approval:** none (research-only, no outbound action)

## WF-2 — Outreach (Email)
- **Trigger:** New qualified lead, or AI Brain recommendation.
- **Steps:** Email Outreach Agent drafts personalized email from approved templates → submits for approval → Gmail Agent sends on approval → tracks delivery → classifies reply → creates follow-up task or CRM stage update.
- **States:** `draft → pending_approval → approved|rejected → sent → delivered → replied|bounced`
- **Events:** `EMAIL_DRAFT_CREATED → EMAIL_APPROVAL_REQUESTED → EMAIL_SENT → EMAIL_REPLY_RECEIVED → FOLLOWUP_CREATED`
- **Approval:** required (email send)

## WF-3 — Content Publishing (LinkedIn/Instagram)
- **Trigger:** Content Studio brief or 30-day calendar slot.
- **Steps:** Content Studio drafts → claim check → approval → LinkedIn/Instagram Agent schedules → publishes → engagement metrics tracked.
- **States:** `draft → claim_checked → pending_approval → approved → scheduled → published`
- **Events:** `LINKEDIN_SCHEDULED/PUBLISHED`, `INSTAGRAM_SCHEDULED/PUBLISHED`
- **Approval:** required (post/DM)

## WF-4 — Demo Lifecycle
- **Trigger:** CRM stage moves to "Demo," or positive reply classified.
- **Steps:** CRM Agent creates demo record → calendar adapter books slot → demo occurs → outcome recorded → CRM stage updated → campaign attribution updated.
- **States:** `booked → completed|no_show`, outcome: `interested|objection|lost`
- **Events:** `DEMO_BOOKED → DEMO_COMPLETED|DEMO_NO_SHOW → CRM_STAGE_CHANGED`
- **Approval:** none (internal record), unless outcome triggers a proposal requiring approval

## WF-5 — Campaign Lifecycle
- **Trigger:** Manual creation or AI Brain recommendation.
- **Steps:** Define goal/audience/channels/products → link content/leads → launch → track attribution → Campaign Intelligence evaluates performance → recommendations generated.
- **States:** `draft → pending_approval → active → completed`
- **Events:** `CAMPAIGN_STARTED → CAMPAIGN_COMPLETED`
- **Approval:** required (campaign launch)

## WF-6 — AI CMO Daily Planning Cycle
- **Trigger:** Scheduled (morning) or manual "replan."
- **Steps:** Read goals/pipeline/approvals/agent health/prior results → generate prioritized plan → select agent per task → persist plan → route required-approval items to Approvals Queue.
- **States:** `planned → executing → evaluated`
- **Events:** `AI_PLAN_CREATED → AI_APPROVAL_REQUESTED`
- **Approval:** per-action, defined by `13_APPROVAL_RULES.md`

## WF-7 — Trend-to-Task
- **Trigger:** Scheduled trend scan or weekly digest generation.
- **Steps:** Trends Agent discovers trend → stores with source/date/relevance → AI Brain evaluates → converts to research/content/campaign task if relevant.
- **States:** `found → digested → converted|dismissed`
- **Events:** `TREND_FOUND`
- **Approval:** none for discovery; downstream task follows its own workflow's approval gate

## WF-8 — Approval Decision
- **Trigger:** Any workflow reaching a `pending_approval` state.
- **Steps:** Item appears in Approvals Queue with target/content/agent/source facts/reason/risk → human selects Approve/Edit/Reject/Revise → decision persisted → execution resumes or halts.
- **States:** `pending → approved|rejected|revised → executed|cancelled`
- **Events:** referenced workflow resumes (e.g. `EMAIL_SENT`) or is cancelled
- **Approval:** this *is* the approval gate — no self-approval by agents

## WF-9 — Agent Failure & Retry
- **Trigger:** Any agent run error.
- **Steps:** Run marked `Failed` → error logged with context (no secrets) → Notification Agent alerts owner → manual or auto retry per policy.
- **States:** `running → failed → retried|disabled`
- **Events:** `WORKFLOW_FAILED`
- **Approval:** none, but repeated failures may require manual intervention before retry
