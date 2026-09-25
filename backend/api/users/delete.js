// backend/api/users/delete.js — DELETE /api/users/:id
// Founder/Admin only. Hard-deletes the user row. Audit log preserves history.
import { pool } from '../../db/pool.js';
import { audit } from '../../services/audit.js';

export async function deleteUserHandler(req, res) {
  const { id } = req.params;
  const actorId = req.user?.id;

  if (id === actorId) {
    return res.status(400).json({
      code: 'CANNOT_DELETE_SELF',
      message: 'You cannot remove your own account.',
    });
  }

  const founders = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE role = 'Founder' AND is_active = TRUE`
  );
  const target = await pool.query(
    'SELECT id, email, full_name, role FROM users WHERE id = $1',
    [id]
  );

  if (target.rowCount === 0) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
  }

  const u = target.rows[0];
  if (u.role === 'Founder' && founders.rows[0].n <= 1) {
    return res.status(400).json({
      code: 'LAST_FOUNDER',
      message: 'Cannot remove the last Founder. Promote another user first.',
    });
  }

  try {
    await audit({
      req,
      action: 'user.removed',
      entityType: 'user',
      entityId: u.id,
      metadata: {
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        removed: true,
      },
      result: 'success',
    });

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    return res.status(200).json({
      ok: true,
      message: 'User removed.',
      user: { id: u.id, email: u.email, fullName: u.full_name, role: u.role },
    });
  } catch (err) {
    console.error('[users/delete] error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not remove user.' });
  }
}