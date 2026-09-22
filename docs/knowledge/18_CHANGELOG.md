# Implementation decisions — 2026-09-17

- Current uploaded specifications are the product reference. The brochure is the source for Sakha capability statements; no clinical validation or guaranteed outcome is implied.
- New Sites implementation uses a Cloudflare D1 database and optimistic workspace revisions instead of the proposed Supabase/Postgres schema. This is a bounded owner-private pilot architecture. Source pack endpoints remain requirements, not an assertion that every specified endpoint is implemented.
- Current UI uses a /api/workspace command endpoint plus /api/gmail and /api/automation. Four-second polling replaces the proposed event push in this pilot.
- Synthetic sample records are separated from each user's live workspace; fictional hospital names use example.com addresses. Real external actions are never represented by simulated events.
- User-requested two- and three-day follow-ups replace the reference template's five-business-day follow-up. Sequence delays are frozen on creation; all three emails can be reviewed before execution.
- The current AI plan is explicitly rule-based. External APIs stay visibly disconnected until configured and verified.
- No account access or outbound messages were executed during the build.

Original source file retained below.

---

# 18 — Changelog

Record every meaningful decision here, not just code changes — this is the "why," `17_PROGRESS.md` is the "what state are we in."

---

## 2026-09-17 — Knowledge pack v1 created

**Decisions:**
- Adopted the 18-file Claude Project knowledge pack structure exactly as defined in the Master Build Plan §29, rather than a freeform docs folder — keeps every future Claude session grounded in the same reference set.
- Dashboard requirements were authored first as a standalone visual specification (published artifact) and then distilled into `03_DASHBOARD_REQUIREMENTS.md` as the text/data reference — the visual version stays the design source of truth, the markdown version stays the Project-knowledge source of truth.
- `10_HEALTHCARE_KNOWLEDGE.md` was deliberately built as a schema + seed set rather than a finished fact base — flagged in `17_PROGRESS.md` as needing a human clinical/compliance owner before Content Studio uses it in production. This is a guardrail decision, not an oversight.
- Default approval posture set to "everything outbound requires approval" for MVP, with an explicit graduation ladder (`13_APPROVAL_RULES.md`) rather than a per-agent ad hoc rule — keeps the rollout auditable and reversible.
- Chose PostgreSQL/Supabase + a typed event bus (WebSocket/SSE) as the realtime backbone, matching the Master Build Plan's Phase 2/3 technical foundation, rather than introducing a separate realtime vendor.

**Rejected/deferred:**
- Deferred any ad-network/paid-media integration — not in the original Agent Map; revisit only after MVP agents (lead intel, outreach, content, CRM) are stable.
- Deferred multi-tenant support — MVP is GoSakha-brand-only.

---

*(Add new entries above this line, most recent first — never delete history)*


## 2026-09-19 — Workflow completion update

- Added server-side social/calendar/AI/search adapters with operation history.
- Added campaign attribution, lifecycle controls and meaningful analytics.
- Added approved plan delegation, demo follow-up tasks and evidence-backed engagement entry.
- Enforced source checks before approvals and outbound execution.
- Added explicit contact archiving/erasure and role enforcement.
- Fixed hot-lead/upcoming-demo inconsistencies and follow-up thread headers.
- Expanded tests from 12 to 32; live integrations still require account configuration and verification.
