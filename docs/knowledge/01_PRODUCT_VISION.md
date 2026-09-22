# 01 — Product Vision

## Mission
GoSakha Healthcare AI CMO is an operating system for healthcare marketing — a single coordinated dashboard that runs specialized AI agents across lead generation, outreach, content, CRM, and analytics for hospitals, clinics, diagnostic centers, and doctors. It is **not** a chatbot and not a generic marketing SaaS template: it is a control center where a human marketing lead sees everything every agent is doing, and approves or redirects it in one place.

## Who it's for
- **Primary user:** GoSakha's own marketing/growth team (the "CMO" seat) — plans campaigns, reviews approvals, reads agent output.
- **Secondary users:** Sales/outreach operators who action hot leads and manage demos.
- **Tertiary:** Leadership, viewing Command Center KPIs and campaign performance read-only.

## Product being marketed
GoSakha's core product is **Sakha** — a 24/7 AI voice assistant that answers hospital patient calls, understands symptoms via full AI medical reasoning, routes patients to the correct specialist, books appointments, and logs everything to a live hospital dashboard. The CMO system's job is to generate demand and pipeline for Sakha (and future GoSakha products) among hospitals, clinics, diagnostic centers, and independent doctors.

## Scope (in)
- Hospital/clinic/diagnostic-center/doctor accounts (B2B marketing target, not patients)
- Multi-channel outreach: Email (Gmail), LinkedIn, Instagram/social
- Lead discovery, scoring, pipeline (CRM)
- Content generation with human approval
- Campaign planning and performance analysis
- An AI orchestrator ("AI CMO Brain") that plans and delegates to specialized agents
- Full observability: live activity feed, agent health, audit log

## Scope (non-goals / out of scope for MVP)
- Patient-facing features (Sakha's own patient-call product is a separate system; this CMO markets it, it does not run it)
- Any handling of real patient/clinical data — development uses synthetic data only
- Fully autonomous outbound actions without human approval (until the rollout plan explicitly graduates a channel)
- Paid ad-buying/ad-network integration (not in the agent map; revisit post-MVP)
- Multi-tenant support for other companies' brands (GoSakha-only in MVP)

## North-star flow
`DATA → KNOWLEDGE → LEADS → OUTREACH → ENGAGEMENT → DEMO/MEETING → CRM → CAMPAIGN → ANALYSIS → AI DECISION → NEXT ACTION`

## Success looks like
- A marketing lead can open one dashboard and answer, in under 10 seconds: which hospitals are active, which leads are hot, what's awaiting my approval, and what the AI recommends next.
- Every outbound action is traceable to a real event, a real approval, and a real source fact — never fabricated.
- The system scales from a mock-only pilot to limited, then expanded, automation without a rebuild.

## Guiding constraints (apply to every phase)
- No fabricated healthcare claims, ever.
- No fake UI — every button maps to a real state, API, or event.
- Default to human approval for outbound/high-impact actions.
- Synthetic data only until the approval-only pilot stage.
- Build in phases; inspect → implement → test → fix → update `17_PROGRESS.md` / `18_CHANGELOG.md` → continue.
