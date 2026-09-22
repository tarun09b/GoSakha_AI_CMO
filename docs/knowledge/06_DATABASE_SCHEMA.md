# 06 — Database Schema (PostgreSQL / Supabase)

Conventions: every table uses a UUID primary key, `created_at`/`updated_at` timestamps, soft-delete where applicable, foreign keys with indexes, and a `source` column (`agent_id` or `user_id`) for auditability. Idempotency keys on any table populated by external webhooks. No real patient/clinical data — synthetic seed data only until production rollout.

## Core entities

**organizations** — id, name, type (`hospital|clinic|diagnostic_center|doctor`), location, segment, status, created_by

**contacts** — id, organization_id (FK), name, role, email, phone, linkedin_url, source, verified_at

**products** — id, name, description, status (`live|in_development|deprecated`), target_segments[]

**knowledge_documents** — id, title, body, category, source, verification_state, owner, updated_at, version

**leads** — id, organization_id (FK), contact_id (FK), product_id (FK, nullable), source, score, stage, temperature, owner_id, last_activity_at, next_action, next_action_due, opt_out (bool)

**lead_activities** — id, lead_id (FK), type, actor (agent_id|user_id), summary, occurred_at, metadata (jsonb)

**email_threads** — id, lead_id (FK), gmail_thread_id, status, opt_out (bool)
**email_messages** — id, thread_id (FK), direction (`in|out`), body, sent_at, delivered_at, opened_at, bounced_at, classification
**email_drafts** — id, thread_id (FK), body, status (`draft|pending_approval|approved|rejected|sent`), created_by_agent

**social_accounts** — id, platform (`linkedin|instagram`), handle, status
**social_posts** — id, platform, account_id (FK), content, status (`draft|pending_approval|scheduled|published`), scheduled_at, published_at, campaign_id (FK, nullable)
**social_metrics** — id, post_id (FK), impressions, likes, comments, shares, recorded_at

**content** — id, type (`blog|linkedin_post|ig_caption|reel_script|email_copy|ad_copy`), body, source_facts[], claim_check_status, version, approval_state, campaign_id (FK, nullable)

**campaigns** — id, name, goal, audience, channels[], product_id (FK), status, start_date, end_date
**campaign_metrics** — id, campaign_id (FK), leads_attributed, demos_attributed, conversions, recorded_at

**demos** — id, lead_id (FK), scheduled_at, participant, product_id (FK), status (`booked|completed|no_show`), outcome (`interested|objection|lost`), notes, next_action

**tasks** — id, related_entity_type, related_entity_id, type (`followup|research|content|campaign`), owner_id, due_date, status

**agent_runs** — id, agent_name, status (`healthy|running|waiting|failed|disabled`), trigger, input_summary, output_summary, started_at, completed_at, latency_ms, retries

**live_events** — id, event_type, actor, entity_type, entity_id, status, message, metadata (jsonb), correlation_id, workflow_run_id, created_at

**ai_plans** — id, created_at, inputs_summary, prioritized_actions (jsonb), selected_agent, status
**ai_decisions** — id, plan_id (FK), proposed_action, reason_summary, required_inputs, approval_required (bool), expected_outcome, resulting_event_id (FK, nullable), outcome_evaluation

**approvals** — id, target_type, target_id, agent_name, proposed_content, source_facts[], reason, risk_level, status (`pending|approved|rejected|revised`), decided_by, decided_at

**notifications** — id, user_id (FK), type, message, read (bool), created_at

**integrations** — id, provider, status, scopes[], last_health_check, last_error

**audit_logs** — id, actor_type (`agent|user`), actor_id, action, entity_type, entity_id, result, occurred_at

**users** — id, email, name, role_id (FK)
**roles** — id, name, permissions (jsonb)

**settings** — id, key, value (jsonb) — brand voice, AI rules, approval rules, notification prefs, security settings

## Relationships (high level)
`organizations 1—N contacts`, `organizations 1—N leads`, `leads 1—N lead_activities`, `leads 1—N email_threads`, `email_threads 1—N email_messages/drafts`, `leads 1—N demos`, `campaigns 1—N social_posts/content/campaign_metrics`, `ai_plans 1—N ai_decisions`, `approvals N—1 [any target_type]`.

## Indexing & constraints
- Unique constraint on `(organization_id, contact_id)` in leads to prevent duplicates.
- Index on `leads.temperature`, `leads.stage`, `live_events.created_at`, `live_events.correlation_id`.
- Idempotency key on `email_messages.gmail_message_id` and `social_posts.platform_post_id` to prevent duplicate webhook processing.
