// backend/api/email/drafts.js
// Draft CRUD for the outreach pipeline.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';
import { renderTemplate, listTemplates } from '../../services/templates.js';

const VALID_TEMPLATES = ['cold_intro', 'follow_up', 'positive_reply'];

// -----------------------------------------------------------------
// POST /api/email/drafts
// Body: { template_id, recipient_email, recipient_name?, recipient_org?,
//         hospital_name, contact_first_name? }
// Renders the template, saves a draft row, returns the draft.
// -----------------------------------------------------------------
export async function createDraftHandler(req, res) {
  const {
    template_id,
    recipient_email,
    recipient_name,
    recipient_org,
    hospital_name,
    contact_first_name,
  } = req.body || {};

  // Validate input
  if (!template_id || !VALID_TEMPLATES.includes(template_id)) {
    return res.status(400).json({
      code: 'INVALID_TEMPLATE',
      message: `template_id must be one of: ${VALID_TEMPLATES.join(', ')}`,
    });
  }
  if (!recipient_email || !recipient_email.includes('@')) {
    return res.status(400).json({
      code: 'INVALID_RECIPIENT',
      message: 'recipient_email must be a valid email address.',
    });
  }
  if (!hospital_name) {
    return res.status(400).json({
      code: 'MISSING_HOSPITAL',
      message: 'hospital_name is required for personalization.',
    });
  }

  try {
    // Get the sender's full name from the DB (JWT only carries email)
    const meResult = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const sender_name = meResult.rows[0]?.full_name || 'GoSakha Team';

    // Render the template
    let rendered;
    try {
      rendered = renderTemplate(template_id, {
        hospital_name,
        contact_first_name: contact_first_name || '',
        sender_name,
        calendar_link: process.env.CALENDAR_LINK || 'https://cal.com/gosakha/15min',
      });
    } catch (tplErr) {
      return res.status(400).json({
        code: 'TEMPLATE_RENDER_FAILED',
        message: tplErr.message,
      });
    }

    // Insert the draft
    const result = await pool.query(
      `INSERT INTO email_drafts
        (recipient_email, recipient_name, recipient_org, subject, body, template_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING id, recipient_email, recipient_name, recipient_org,
                 subject, body, template_id, status, created_at`,
      [
        recipient_email.trim().toLowerCase(),
        recipient_name?.trim() || null,
        recipient_org?.trim() || null,
        rendered.subject,
        rendered.body,
        rendered.template_id,
        req.user.id,
      ]
    );

    const draft = result.rows[0];

    await audit({
      req,
      action: 'email.draft_created',
      entityType: 'email_draft',
      entityId: draft.id,
      metadata: {
        template_id: draft.template_id,
        recipient: draft.recipient_email,
      },
      result: 'success',
    });

    return res.status(201).json({ draft });
  } catch (err) {
    console.error('[email/drafts] create error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not create draft.',
    });
  }
}

// -----------------------------------------------------------------
// GET /api/email/drafts?status=draft&limit=50
// -----------------------------------------------------------------
export async function listDraftsHandler(req, res) {
  const status = req.query.status;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'sent', 'failed'];

  try {
    const params = [];
    let where = '';
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          code: 'INVALID_STATUS',
          message: `status must be one of: ${validStatuses.join(', ')}`,
        });
      }
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }
    params.push(limit);

    const result = await pool.query(
      `SELECT id, recipient_email, recipient_name, recipient_org,
              subject, body, template_id, status,
              created_at, submitted_at, sent_at, gmail_message_id, error
       FROM email_drafts
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return res.status(200).json({
      drafts: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    console.error('[email/drafts] list error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not list drafts.',
    });
  }
}

// -----------------------------------------------------------------
// GET /api/email/drafts/:id
// -----------------------------------------------------------------
export async function getDraftHandler(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.*, u.full_name AS created_by_name
       FROM email_drafts d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Draft not found.' });
    }
    return res.status(200).json({ draft: result.rows[0] });
  } catch (err) {
    console.error('[email/drafts] get error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not load draft.' });
  }
}

// -----------------------------------------------------------------
// POST /api/email/drafts/:id/submit-approval
// Moves a draft from `draft` → `pending_approval` and creates an
// approvals row so a human can act on it.
// -----------------------------------------------------------------
export async function submitForApprovalHandler(req, res) {
  const draftId = req.params.id;

  try {
    // Load draft — must exist and be in `draft` state
    const draftResult = await pool.query(
      'SELECT id, status, recipient_email, subject FROM email_drafts WHERE id = $1',
      [draftId]
    );
    if (draftResult.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Draft not found.' });
    }
    const draft = draftResult.rows[0];
    if (draft.status !== 'draft') {
      return res.status(400).json({
        code: 'INVALID_STATE',
        message: `Draft must be in "draft" state to submit (currently "${draft.status}").`,
      });
    }

    // Transaction so both writes succeed or both rollback
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE email_drafts
         SET status = 'pending_approval', submitted_at = NOW()
         WHERE id = $1`,
        [draftId]
      );

      const approvalResult = await client.query(
        `INSERT INTO approvals (target_type, target_id, action_type, status, requested_by)
         VALUES ('email_draft', $1, 'email.send', 'pending', $2)
         RETURNING id, created_at`,
        [draftId, req.user.id]
      );

      await client.query('COMMIT');

      await audit({
        req,
        action: 'email.submitted_for_approval',
        entityType: 'email_draft',
        entityId: draftId,
        metadata: {
          approval_id: approvalResult.rows[0].id,
          recipient: draft.recipient_email,
        },
        result: 'success',
      });

      return res.status(200).json({
        ok: true,
        draft_id: draftId,
        status: 'pending_approval',
        approval_id: approvalResult.rows[0].id,
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[email/drafts] submit-approval error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not submit for approval.',
    });
  }
}

// -----------------------------------------------------------------
// GET /api/email/templates — list available templates
// -----------------------------------------------------------------
export function listTemplatesHandler(req, res) {
  return res.status(200).json({ templates: listTemplates() });
}