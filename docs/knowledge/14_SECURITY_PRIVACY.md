# 14 — Security & Privacy

## Data boundary (non-negotiable)
This system handles **B2B marketing/sales data** — hospital/clinic organization records, business contacts, outreach threads, campaign data. It must **never** ingest real patient or clinical data. Development and staging use synthetic seed data exclusively. If a real patient record is ever accidentally introduced, it is deleted and the incident is logged and reviewed.

## RBAC
Roles defined in `02_PRD.md` §1. Least-privilege default: a new role starts with zero permissions and is granted access explicitly per module. Agent service accounts get scoped credentials per integration — never a shared admin key.

## Secret management
- No API keys, tokens, or credentials in frontend code, git history, or logs.
- Secrets stored in a dedicated secret manager (e.g. environment-injected at deploy, never hardcoded).
- Rotation policy defined per provider; Integrations module (`15_INTEGRATION_REQUIREMENTS.md`) shows connection status, never the secret value.

## Encryption
- Data encrypted at rest (database-level) and in transit (TLS everywhere, including internal service calls where feasible).

## Audit
- Every write action (human or agent) logs actor, action, entity, result, timestamp to `audit_logs` — see `06_DATABASE_SCHEMA.md`.
- Audit log is append-only from the application layer.

## Retention & deletion
- Define retention windows per entity type (e.g. lead data retained per opt-out/consent state; raw email content retention window set in Settings).
- Deletion requests (opt-out, GDPR-style erasure where applicable) propagate across leads, activities, and threads — implemented as a real workflow, not a manual one-off.

## Opt-out handling
- `opt_out` flag on leads/threads is checked by every outbound-capable agent before any send — enforced at the API layer, not just the UI, so no agent path can bypass it.

## Prompt-injection & tool authorization
- Any content ingested from external sources (email replies, social comments, web research results) is treated as **untrusted input**, never as instructions to an agent.
- Agent tool calls are scoped per agent (e.g. the Trends Agent cannot call the Gmail send endpoint) — enforce this at the tool-authorization layer, not by convention.
- The AI CMO Brain's delegation to other agents is logged and constrained to the documented tool set in `04_AGENT_SPECIFICATIONS.md`.

## Healthcare-specific guardrails
- No fabricated medical/clinical claims (enforced via `10_HEALTHCARE_KNOWLEDGE.md` claim-check).
- Human approval required for any sensitive-claim content, regardless of automation rollout stage (`13_APPROVAL_RULES.md`).

## Compliance posture
This system does not claim HIPAA, GDPR, or other regulatory compliance certification unless professionally assessed and documented here with evidence. Marketing and engineering must not state a compliance claim that hasn't been formally verified.

## Required security tests
See `16_TEST_PLAN.md` — RBAC boundary tests, approval-bypass tests, secret-exposure scans, webhook signature verification tests, opt-out enforcement tests.
