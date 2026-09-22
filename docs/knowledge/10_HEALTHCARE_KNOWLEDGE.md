# 10 — Healthcare Knowledge Base

This file is a **structure**, not a finished fact set — it must be populated and kept current by a designated clinical/compliance owner before any content agent is allowed to draw on it. Every entry requires source, verification state, owner, and updated date. No entry may be invented by an AI agent.

## Entry schema

| Field | Requirement |
| --- | --- |
| `fact_id` | unique identifier |
| `statement` | the claim, in plain language |
| `category` | e.g. symptom-routing, safety-behavior, feature-capability |
| `source` | document/person/system of record |
| `verification_state` | `verified \| pending \| rejected` |
| `owner` | accountable person |
| `updated_at` | date |
| `applies_to` | which product/service this fact supports |

## Seeded entries (from GoSakha brochure — see `09_BRAND_KNOWLEDGE.md` for full context)

| fact_id | statement | source | verification_state | owner |
| --- | --- | --- | --- | --- |
| HK-001 | Sakha detects emergency symptoms (chest pain, stroke signs, breathing difficulty) and directs the caller to call 112 or go to the ER | GoSakha brochure | verified (per brochure) | TBD |
| HK-002 | Sakha routes patients to the correct specialist based on described symptoms | GoSakha brochure | verified (per brochure) | TBD |
| HK-003 | Sakha operates 24/7 with unlimited simultaneous call handling | GoSakha brochure | verified (per brochure) | TBD |
| HK-004 | Sakha books appointments and issues confirmation reference numbers | GoSakha brochure | verified (per brochure) | TBD |

*"Verified (per brochure)" means the claim is sourced to GoSakha's own published materials, not to an independent clinical trial or regulatory body. Content Studio and the Trends Agent must not upgrade this to an unqualified "clinically proven" claim.*

## Prohibited claim patterns (apply across every channel)
- No claim of diagnostic accuracy, cure, or guaranteed outcome.
- No comparison to a named competitor's product without a verified, sourced basis.
- No claim implying regulatory approval/certification unless a verified certificate exists in this file.
- No claim about patient data privacy/security beyond what `14_SECURITY_PRIVACY.md` documents as actually implemented.
- No use of urgency/fear-based framing around medical emergencies in marketing copy (informational tone only).

## Governance
- New facts enter as `pending` and require sign-off from the designated clinical/compliance owner before any agent may cite them.
- Facts are versioned; a correction supersedes rather than silently overwrites — Content Studio re-checks published content against the current verified set on a recurring schedule.
- This file is the single source of truth Content Studio's claim-checker queries against (see `04_AGENT_SPECIFICATIONS.md` — Content Studio Agent).
