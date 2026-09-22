# 04 — Agent Specifications

Each agent is a modular service behind a provider adapter. All agents publish typed events, persist their runs, and respect global opt-out/approval rules.

---

## AI CMO Brain (orchestrator)
- **Inputs:** goals, product priorities, hospital activity, leads, email/social status, campaign performance, trends, agent health, approvals, overdue tasks.
- **Outputs:** prioritized plan, selected agent, proposed action, reason summary, required inputs, approval requirement, expected outcome, resulting event/task.
- **Tools:** read access to all entity tables, delegate-to-agent call, structured-output generation via Claude API.
- **Limits:** never invents data; never bypasses approval; if data is insufficient, creates a research task instead of acting; every decision persisted and evaluated post-execution.

## Gmail Agent
- **Inputs:** authorized Gmail account, CRM lead/thread context.
- **Outputs:** synced threads, AI-drafted replies/outreach (pending approval), sent confirmations, reply classifications, follow-up tasks, opt-out flags.
- **Tools:** Gmail API adapter (read/send scopes only, least privilege).
- **Limits:** never sends without approval unless the rollout stage has graduated the channel; never exposes credentials to frontend; isolates provider-specific code.

## Email Outreach Agent
- **Inputs:** target segment, lead list, approved templates, brand voice.
- **Outputs:** personalized draft, target volume (20–50/day), reply-rate/open-rate metrics, auto-follow-up schedule.
- **Tools:** template engine, Lead Intelligence output, Content Studio drafts.
- **Limits:** respects daily volume caps and opt-out list; every draft cites source facts.

## Lead Intelligence Agent
- **Inputs:** target segment, geography, organization type, product, desired decision-maker roles.
- **Outputs:** organization, verified business info, contact + role, professional URL (where available), legitimate public business contact, source, confidence score, lead score, recommended action.
- **Tools:** web research adapters, deduplication service.
- **Limits:** collects no unnecessary personal/patient information; deduplicates before creating a new lead.

## LinkedIn Agent
- **Inputs:** content brief from Content Studio, professional outreach targets.
- **Outputs:** drafts, approval state, scheduled/published status, engagement metrics (where API-available), outreach drafts, CRM linkage.
- **Tools:** LinkedIn supported APIs only.
- **Limits:** no scraping or bypass of platform controls; mock provider used until a real integration is tested end-to-end.

## Instagram / Social Agent
- **Inputs:** approved healthcare knowledge, campaign brief.
- **Outputs:** 30-day content calendar, post/carousel/Reel/Story drafts, approval state, scheduling/published status, metrics, campaign linkage.
- **Tools:** Meta supported APIs only.
- **Limits:** mock accounts during development; no unsupported automation.

## Content Studio Agent
- **Inputs:** hospital/clinic, service, audience, campaign, goal, channel, approved facts.
- **Outputs:** draft, source facts, claim check result, channel, CTA, approval state, version history.
- **Tools:** brand/healthcare knowledge retrieval, claim-checker.
- **Limits:** never invents clinical claims; every claim traces to a sourced, verified fact in `10_HEALTHCARE_KNOWLEDGE.md`.

## CRM Agent
- **Inputs:** lead events, activity events, demo outcomes.
- **Outputs:** updated leads/activities/pipeline stage/tasks/demos, hot-queue escalations.
- **Tools:** entity write access (leads, activities, tasks, demos).
- **Limits:** every activity records its source agent/user.

## Campaign Intelligence Agent
- **Inputs:** campaign definitions, linked leads/emails/posts/content/demos/outcomes.
- **Outputs:** funnel metrics, channel/source comparison, alerts, recommendations.
- **Tools:** attribution engine reading only stored data.
- **Limits:** never invents ROI or cost figures not present in the data.

## Trends Agent
- **Inputs:** healthcare/AI/marketing/competitor sources.
- **Outputs:** title, summary, source/reference, date, relevance, category, recommended action; weekly digest.
- **Tools:** web research adapter.
- **Limits:** never presents unsourced claims as fact; every trend cites its source.

## Notification Agent
- **Inputs:** approval requests, hot-lead escalations, agent failures.
- **Outputs:** routed alerts (in-app, email) to the correct role.

## Audit/Observability
- **Inputs:** every agent run and human decision.
- **Outputs:** immutable audit log entries (who/what/when/agent/user/source/result); run detail for Agent Center.
