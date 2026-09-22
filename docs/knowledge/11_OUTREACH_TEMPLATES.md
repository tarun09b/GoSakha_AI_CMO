# 11 — Outreach Templates

All templates are starting points — the Email Outreach / LinkedIn / Content Studio agents personalize placeholders from verified lead and knowledge data only. No agent may invent a placeholder value; if a field is missing, the agent leaves it flagged for human completion rather than guessing.

## Email — Cold Intro (Hospital / Clinic decision-maker)

**Subject:** A 24/7 voice assistant for {{hospital_name}}'s patient calls

Hi {{contact_first_name}},

I'm reaching out from GoSakha — we've built Sakha, an AI assistant that answers hospital patient calls around the clock, understands symptoms, routes callers to the right specialist, and books the appointment automatically. Hospitals use it to make sure no patient call goes unanswered, day or night.

Would a 15-minute walkthrough be useful for {{hospital_name}}?

Best,
{{sender_name}}
GoSakha Innovations

*Approval required before send. Source facts: `09_BRAND_KNOWLEDGE.md`.*

## Email — Follow-up (no reply, 5 business days)

**Subject:** Re: A 24/7 voice assistant for {{hospital_name}}'s patient calls

Hi {{contact_first_name}}, following up in case this got buried — happy to send a short demo video instead of a call if that's easier. Let me know what works.

{{sender_name}}

## Email — Positive Reply → Demo Scheduling

Hi {{contact_first_name}}, glad this is useful. Here's a link to grab a time that works for you: {{calendar_link}}. Looking forward to showing you how Sakha handles routing and emergency detection live.

## LinkedIn — Connection Note

Hi {{contact_first_name}} — I work with GoSakha, building an AI assistant for hospital patient calls. Would love to connect and share what we're seeing with hospitals like {{hospital_name}}.

## LinkedIn — Post-Connect DM

Thanks for connecting, {{contact_first_name}}. Quick context: Sakha handles 24/7 patient call triage and appointment booking for hospitals — happy to share a short walkthrough if useful, no pressure either way.

## Instagram — Caption Template (educational post)

{{headline}} — did you know a missed hospital call at 2am is a missed patient? Sakha answers every call, every time. Link in bio to learn how it works. #HealthcareAI #PatientExperience

*All social copy passes through claim-check against `10_HEALTHCARE_KNOWLEDGE.md` before approval.*

## Objection-handling snippets (for reply drafting, human-reviewed)

- **"We already have a call center":** Acknowledge, then position Sakha as a 24/7 overflow/after-hours layer rather than a replacement — never claim staff replacement without the prospect raising it first.
- **"Is this safe for emergencies?":** Point directly to the emergency-detection behavior (HK-001) — this is the strongest, most defensible answer and should never be softened or omitted.
- **"How much does it cost?":** Do not quote pricing in an automated draft — flag for human pricing conversation.

## Governance
- Every template is versioned in `content` with `type` and `version`.
- New templates require Content Reviewer approval before entering the approved set an agent can draw from.
