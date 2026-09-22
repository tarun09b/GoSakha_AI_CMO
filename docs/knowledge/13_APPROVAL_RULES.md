# 13 — Approval Rules

Default posture: **every outbound or high-impact action requires human approval** until a channel is explicitly graduated per the rollout sequence in `17_PROGRESS.md` / Phase 21 of the master build plan.

## Rollout sequence (gates automation level)
`Mock → Internal → Approval-only → Limited automation → Expanded automation`

No channel skips a stage. "Limited automation" still requires approval for high-risk categories below even after a channel graduates.

## Action → Approval requirement matrix

| Action | Requires approval? | Notes |
| --- | --- | --- |
| Email send (cold outreach) | Yes, always in MVP | Auto-send only after channel reaches "Expanded automation" AND action is low-risk (see below) |
| Email follow-up (templated, no new claims) | Yes in MVP; eligible for auto in "Limited automation" | |
| LinkedIn post (content) | Yes | |
| LinkedIn DM (outreach) | Yes, always | Professional outreach carries reputational risk |
| Instagram post/Reel | Yes | |
| Instagram DM/comment reply | Yes, always | Public-facing, higher risk |
| Campaign launch | Yes, always | |
| Any content citing a healthcare/clinical claim | Yes, always, regardless of rollout stage | Sensitive-claim approval never auto-graduates |
| High-value or bulk outreach (>1 recipient batch) | Yes, always | Full batch preview required |
| AI CMO Brain recommendation → new workflow | Yes, until Brain's track record is reviewed and a lower-risk subset is explicitly whitelisted | |
| Internal CRM stage update from a completed action | No | Record-keeping only, not outbound |
| Trend discovery / digest generation | No | Read-only research |
| Lead discovery / scoring | No | No outbound action taken |

## Approval record requirements
Every approval decision persists: target, proposed content, agent, source facts, reason, risk level, decision, decider, timestamp. Bypass attempts (an agent trying to execute without a recorded approval where one is required) must fail closed and generate an audit + alert event — see `16_TEST_PLAN.md` for the required bypass tests.

## Escalation
- A rejected item returns to the originating agent's queue with the rejection reason attached — never silently discarded.
- Three consecutive rejections of the same action type from the same agent trigger a review flag on that agent in Agent Center.

## Review cadence
Approval rules themselves are Settings-managed and reviewed at each rollout-stage graduation (never silently loosened by an agent or a config change without an explicit Admin action, logged to the Audit Log).
