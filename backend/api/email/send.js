// backend/api/email/send.js
// POST /api/email/send
// Body: { draft_id }
//
// Fail-closed approval gate: sends only if the draft is approved AND
// a matching approval record exists with status 'approved'.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';
import { sendEmail } from '../../services/gmail-sender.js';

export async function sendDraftHandler(req, res) {
  const { draft_id } = req.body || {};
  const actorId = req.user.id;

  if (!draft_id) {
    return res.status(400).json({
      code: 'MISSING_DRAFT_ID',
      message: 'draft_id is required.',
    });
  }

  // ---- Gate 1: draft exists ----
  const draftResult = await pool.query(
    `SELECT id, recipient_email, recipient_name, subject, body, status, sent_at
     FROM email_drafts
     WHERE id = $1`,
    [draft_id]
  );

  if (draftResult.rowCount === 0) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Draft not found.',
    });
  }

  const draft = draftResult.rows[0];

  // ---- Gate 2: draft status must be 'approved' ----
  if (draft.status === 'sent') {
    return res.status(400).json({
      code: 'ALREADY_SENT',
      message: 'This draft has already been sent.',
    });
  }

  if (draft.status !== 'approved') {
    await audit({
      req,
      action: 'email.send_blocked',
      entityType: 'email_draft',
      entityId: draft_id,
      metadata: { reason: 'draft_not_approved', current_status: draft.status },
      result: 'blocked',
    });
    return res.status(403).json({
      code: 'APPROVAL_REQUIRED',
      message: `Draft must be approved before sending. Current status: "${draft.status}".`,
    });
  }

  // ---- Gate 3: an approved approval record must exist ----
  const approvalResult = await pool.query(
    `SELECT id, status, decided_by, decided_at
     FROM approvals
     WHERE target_type = 'email_draft'
       AND target_id = $1
       AND action_type = 'email.send'
       AND status = 'approved'
     ORDER BY decided_at DESC
     LIMIT 1`,
    [draft_id]
  );

  if (approvalResult.rowCount === 0) {
    await audit({
      req,
      action: 'email.send_blocked',
      entityType: 'email_draft',
      entityId: draft_id,
      metadata: { reason: 'no_approved_approval_record' },
      result: 'blocked',
    });
    return res.status(403).json({
      code: 'APPROVAL_REQUIRED',
      message: 'No approved approval record exists for this draft.',
    });
  }

  const approval = approvalResult.rows[0];

  // ---- Send via Gmail ----
  try {
    const gmailResult = await sendEmail({
      to: draft.recipient_email,
      subject: draft.subject,
      body: draft.body,
    });

    // Update draft state — save both message id AND thread id
    await pool.query(
      `UPDATE email_drafts
       SET status = 'sent',
           sent_at = NOW(),
           gmail_message_id = $1,
           gmail_thread_id = $2,
           error = NULL
       WHERE id = $3`,
      [gmailResult.id, gmailResult.threadId || null, draft_id]
    );

    await audit({
      req,
      action: 'email.sent',
      entityType: 'email_draft',
      entityId: draft_id,
      metadata: {
        recipient: draft.recipient_email,
        subject: draft.subject,
        gmail_message_id: gmailResult.id,
        gmail_thread_id: gmailResult.threadId,
        approval_id: approval.id,
        approved_by: approval.decided_by,
      },
      result: 'success',
    });

    return res.status(200).json({
      ok: true,
      draft_id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      gmail_message_id: gmailResult.id,
      gmail_thread_id: gmailResult.threadId,
    });
  } catch (err) {
    console.error('[email/send] Gmail error:', err.message);

    // Mark draft as failed but leave approval intact for retry
    await pool.query(
      `UPDATE email_drafts SET status = 'failed', error = $1 WHERE id = $2`,
      [err.message.slice(0, 500), draft_id]
    );

    await audit({
      req,
      action: 'email.send_failed',
      entityType: 'email_draft',
      entityId: draft_id,
      metadata: {
        recipient: draft.recipient_email,
        error: err.message.slice(0, 300),
      },
      result: 'failure',
    });

    return res.status(500).json({
      code: 'SEND_FAILED',
      message: `Gmail error: ${err.message}`,
    });
  }
}
