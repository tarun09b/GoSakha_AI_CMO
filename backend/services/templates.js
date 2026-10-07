// backend/services/templates.js
// Outreach email templates for the GoSakha AI CMO.
// Every claim maps to a fact in 10_HEALTHCARE_KNOWLEDGE.md.
// Never add new claims without a verified fact ID.

export const TEMPLATES = {

  // ----------------------------------------------------------
  // cold_intro — first email to a hospital
  // Claim sources: HK-001 (emergency detection), HK-002 (routing),
  //                HK-003 (24/7), HK-004 (booking)
  // ----------------------------------------------------------
  cold_intro: {
    id: 'cold_intro',
    label: 'Cold intro',
    subject: "A 24/7 voice assistant for patient calls at {{hospital_name}}",
    body: `Hi {{greeting_name}},

I'm reaching out from GoSakha. We've built Sakha, an AI assistant that
answers hospital patient calls around the clock - understands symptoms in
the patient's own words, routes the call to the right specialist, and
books the appointment automatically.

If Sakha detects emergency symptoms (chest pain, stroke signs, breathing
difficulty), it immediately tells the caller to call 112 or go to the ER.
Patient safety comes first.

Hospitals use Sakha so no patient call goes unanswered, day or night.

Would a 15-minute walkthrough be useful for {{hospital_name}}?

Best regards,
{{sender_name}}
GoSakha Innovations`,
  },

  // ----------------------------------------------------------
  // follow_up — 5 business days after no reply
  // Same thread as cold_intro (Re: prefix keeps it in the same
  // Gmail conversation, which improves open rates)
  // ----------------------------------------------------------
  follow_up: {
    id: 'follow_up',
    label: 'Follow-up (no reply)',
    subject: "Re: A 24/7 voice assistant for patient calls at {{hospital_name}}",
    body: `Hi {{greeting_name}},

Following up on my note below in case it got buried.

If a call is easier than an email, happy to send a short 2-minute demo
video instead - just let me know.

Would this be useful for {{hospital_name}}?

Best regards,
{{sender_name}}
GoSakha Innovations`,
  },

  // ----------------------------------------------------------
  // positive_reply — sent only after the prospect replies positively
  // ----------------------------------------------------------
  positive_reply: {
    id: 'positive_reply',
    label: 'Positive reply - schedule demo',
    subject: "Re: A 24/7 voice assistant for {{hospital_name}}'s patient calls",
    body: `Hi {{greeting_name}},

Glad this is interesting.

Here's a link to grab a 15-minute slot that works for you:
{{calendar_link}}

In the demo we'll walk through exactly how Sakha handles:

  - Answering every call, 24/7, in the hospital's name
  - Understanding symptoms in the patient's own words
  - Routing to the right specialist and booking the appointment
  - Flagging emergency symptoms and directing the caller to 112/ER

Looking forward to it.

Best regards,
{{sender_name}}
GoSakha Innovations`,
  },
};

/**
 * Fill a template's placeholders with values.
 * @param {string} templateId - 'cold_intro' | 'follow_up' | 'positive_reply'
 * @param {object} vars - { hospital_name, contact_first_name, sender_name, calendar_link? }
 * @returns {{ subject: string, body: string, template_id: string }}
 */
export function renderTemplate(templateId, vars) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  // Compute the greeting name:
  //   - If contact first name exists → use it ("Rao")
  //   - Otherwise → fall back to "{hospital_name} team" ("Apollo Hospitals team")
  const contactName = String(vars.contact_first_name ?? '').trim();
  const hospitalName = String(vars.hospital_name ?? '').trim();
  const greetingName = contactName || (hospitalName ? `${hospitalName} team` : 'there');

  // Merge computed values into the substitution map
  const finalVars = { ...vars, greeting_name: greetingName };

  // Required placeholders per template. contact_first_name is OPTIONAL —
  // we fall back to the hospital name in the greeting.
  const required = {
    cold_intro:     ['hospital_name', 'sender_name'],
    follow_up:      ['hospital_name', 'sender_name'],
    positive_reply: ['hospital_name', 'sender_name', 'calendar_link'],
  }[templateId];

  const missing = required.filter((k) => !finalVars[k] || String(finalVars[k]).trim() === '');
  if (missing.length) {
    throw new Error(`Missing required placeholders for "${templateId}": ${missing.join(', ')}`);
  }

  const fill = (str) =>
    str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(finalVars[key] ?? '').trim());

  return {
    template_id: templateId,
    subject: fill(tpl.subject),
    body: fill(tpl.body),
  };
}

export function listTemplates() {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.label }));
}
