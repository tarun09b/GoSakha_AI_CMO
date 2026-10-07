// backend/api/leads/draft-email.js
// POST /api/leads/:id/draft-email
// Body: { recipient_email?, recipient_name?, template_id?, submit_for_approval? }
//
// Turns a lead into a ready-to-approve email draft.
// If recipient_email is not provided in the body, uses the organization's stored email.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';
import { renderTemplate } from '../../services/templates.js';

const VALID_TEMPLATES = ['cold_intro', 'follow_up', 'positive_reply'];

export async function draftEmailForLeadHandler(req, res) {
  const leadId = req.params.id;
  const body = req.body || {};
  const template_id = body.template_id || 'cold_intro';
  const recipient_name = body.recipient_name || null;
  const submit_for_approval = body.submit_for_approval !== false;
  const body_recipient_email = body.recipient_email || null;
  const actorId = req.user.id;

  // Validate template
  if (!VALID_TEMPLATES.includes(template_id)) {
    return res.status(400).json({
      code: 'INVALID_TEMPLATE',
      message: `template_id must be one of: ${VALID_TEMPLATES.join(', ')}`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Load the lead + its organization
    const leadResult = await client.query(
      `SELECT
         l.id, l.stage, l.temperature, l.opt_out,
         o.id AS org_id, o.name AS org_name, o.city AS org_city,
         o.email AS org_email
       FROM leads l
       JOIN organizations o ON o.id = l.organization_id
       WHERE l.id = $1`,
      [leadId]
    );

    if (leadResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Lead not found.' });
    }

    const lead = leadResult.rows[0];

    // 2. Enforce opt-out
    if (lead.opt_out) {
      await client.query('ROLLBACK');
      await audit({
        req,
        action: 'email.draft_blocked',
        entityType: 'lead',
        entityId: leadId,
        metadata: { reason: 'lead_opted_out' },
        result: 'blocked',
      });
      return res.status(403).json({
        code: 'LEAD_OPTED_OUT',
        message: 'This lead has opted out. Cannot create drafts.',
      });
    }

    // 3. Determine recipient email (body overrides org's email)
    const recipient_email = String(
      body_recipient_email || lead.org_email || ''
    ).trim().toLowerCase();

    if (!recipient_email || !recipient_email.includes('@')) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        code: 'NO_RECIPIENT_EMAIL',
        message: 'No email address available for this hospital. Add one manually or re-scrape.',
      });
    }

    // 4. Render the template
    const meResult = await client.query(
      'SELECT full_name FROM users WHERE id = $1',
      [actorId]
    );
    const sender_name = meResult.rows[0]?.full_name || 'GoSakha Team';

    let rendered;
    try {
      rendered = renderTemplate(template_id, {
        hospital_name: lead.org_name,
        contact_first_name: '',
        sender_name,
        calendar_link: process.env.CALENDAR_LINK || 'https://cal.com/gosakha/15min',
      });
    } catch (tplErr) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        code: 'TEMPLATE_RENDER_FAILED',
        message: tplErr.message,
      });
    }

    // 5. Insert the draft
    const draftResult = await client.query(
      `INSERT INTO email_drafts
        (recipient_email, recipient_name, recipient_org, subject, body, template_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING id, recipient_email, recipient_name, recipient_org,
                 subject, body, template_id, status, created_at`,
      [
        recipient_email,
        recipient_name,
        lead.org_name,
        rendered.subject,
        rendered.body,
        rendered.template_id,
        actorId,
      ]
    );

    const draft = draftResult.rows[0];

    // 6. Optionally submit for approval
    let approval_id = null;
    if (submit_for_approval) {
      await client.query(
        `UPDATE email_drafts
         SET status = 'pending_approval', submitted_at = NOW()
         WHERE id = $1`,
        [draft.id]
      );

      const apResult = await client.query(
        `INSERT INTO approvals (target_type, target_id, action_type, status, requested_by)
         VALUES ('email_draft', $1, 'email.send', 'pending', $2)
         RETURNING id`,
        [draft.id, actorId]
      );

      approval_id = apResult.rows[0].id;
      draft.status = 'pending_approval';
    }

    await client.query('COMMIT');

    // 7. Audit
    await audit({
      req,
      action: 'email.draft_from_lead',
      entityType: 'email_draft',
      entityId: draft.id,
      metadata: {
        lead_id: leadId,
        org_name: lead.org_name,
        recipient: draft.recipient_email,
        template_id,
        submitted_for_approval: submit_for_approval,
      },
      result: 'success',
    });

    return res.status(201).json({
      draft,
      approval_id,
      lead: {
        id: lead.id,
        org_name: lead.org_name,
        stage: lead.stage,
        temperature: lead.temperature,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[leads/draft-email] error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not create draft.',
      detail: err.message,
    });
  } finally {
    client.release();
  }
}