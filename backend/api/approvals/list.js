// backend/api/approvals/list.js
// GET /api/approvals?status=pending&limit=50
// Returns approvals joined with their email_drafts for the UI.
import { pool } from '../../db/pool.js';

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

export async function listApprovalsHandler(req, res) {
  const status = String(req.query.status || 'pending').toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      code: 'INVALID_STATUS',
      message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.target_type,
         a.target_id,
         a.action_type,
         a.status,
         a.reason,
         a.created_at,
         a.decided_at,
         a.requested_by,
         a.decided_by,
         d.subject,
         d.body,
         d.recipient_email,
         d.recipient_name,
         d.recipient_org,
         d.template_id,
         d.status AS draft_status,
         d.sent_at,
         d.gmail_message_id,
         u_req.full_name AS requested_by_name,
         u_req.email     AS requested_by_email,
         u_dec.full_name AS decided_by_name
       FROM approvals a
       LEFT JOIN email_drafts d
              ON d.id = a.target_id AND a.target_type = 'email_draft'
       LEFT JOIN users u_req ON u_req.id = a.requested_by
       LEFT JOIN users u_dec ON u_dec.id = a.decided_by
       WHERE a.status = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [status, limit]
    );

    return res.status(200).json({
      approvals: result.rows,
      total: result.rowCount,
      status,
    });
  } catch (err) {
    console.error('[approvals/list] error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not load approvals.',
    });
  }
}