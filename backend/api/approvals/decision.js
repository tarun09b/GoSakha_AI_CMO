// backend/api/approvals/decision.js
// POST /api/approvals/:id/decision
// Body: { action: "approve" | "reject", reason?: "..." }
//
// Strict mode: the person who requested the approval cannot decide it.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';

export async function approvalDecisionHandler(req, res) {
  const approvalId = req.params.id;
  const { action, reason } = req.body || {};
  const actorId = req.user.id;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      code: 'INVALID_ACTION',
      message: 'action must be "approve" or "reject".',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Load the approval row + lock it to prevent race conditions
    const apResult = await client.query(
      `SELECT id, target_type, target_id, action_type, status, requested_by
       FROM approvals
       WHERE id = $1
       FOR UPDATE`,
      [approvalId]
    );

    if (apResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Approval not found.',
      });
    }

    const approval = apResult.rows[0];

    // 2. Must be pending
    if (approval.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        code: 'ALREADY_DECIDED',
        message: `This approval is already "${approval.status}".`,
      });
    }

    // 3. No self-approval — the requester cannot decide their own item
    if (approval.requested_by === actorId) {
      await client.query('ROLLBACK');

      await audit({
        req,
        action: 'approval.self_approval_blocked',
        entityType: 'approval',
        entityId: approvalId,
        result: 'blocked',
      });

      return res.status(403).json({
        code: 'SELF_APPROVAL_BLOCKED',
        message: 'You cannot decide an approval you requested yourself.',
      });
    }

    // 4. Update the approval row
    const newApprovalStatus = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE approvals
       SET status = $1, decided_by = $2, decided_at = NOW(), reason = $3
       WHERE id = $4`,
      [newApprovalStatus, actorId, reason?.trim() || null, approvalId]
    );

    // 5. Update the target — for now only email_draft is supported
    if (approval.target_type === 'email_draft') {
      const draftStatus = action === 'approve' ? 'approved' : 'rejected';
      await client.query(
        `UPDATE email_drafts SET status = $1 WHERE id = $2`,
        [draftStatus, approval.target_id]
      );
    }

    await client.query('COMMIT');

    // 6. Audit — outside the transaction so a failed audit doesn't roll back the decision
    await audit({
      req,
      action: action === 'approve' ? 'approval.approved' : 'approval.rejected',
      entityType: 'approval',
      entityId: approvalId,
      metadata: {
        target_type: approval.target_type,
        target_id: approval.target_id,
        action_type: approval.action_type,
        reason: reason?.trim() || null,
      },
      result: 'success',
    });

    return res.status(200).json({
      ok: true,
      approval_id: approvalId,
      status: newApprovalStatus,
      decided_at: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[approvals/decision] error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not process decision.',
    });
  } finally {
    client.release();
  }
}