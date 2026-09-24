// backend/api/users/update.js — PATCH /api/users/:id
import { pool } from '../../db/pool.js';

const ALLOWED_ROLES = ['Founder', 'Admin', 'CMO', 'Sales', 'Content Reviewer', 'Viewer'];

export async function updateUserHandler(req, res) {
  const { id } = req.params;
  const { role, isActive, fullName } = req.body || {};

  // Prevent a user from disabling their own account
  if (req.user.id === id && isActive === false) {
    return res.status(400).json({
      code: 'CANNOT_DISABLE_SELF',
      message: 'You cannot disable your own account.',
    });
  }

  // Prevent removing the last Founder
  if (role && role !== 'Founder') {
    const founders = await pool.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE role = 'Founder' AND is_active = TRUE`
    );
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (target.rowCount === 1 && target.rows[0].role === 'Founder' && founders.rows[0].n <= 1) {
      return res.status(400).json({
        code: 'LAST_FOUNDER',
        message: 'Cannot change the last Founder’s role. Promote another user first.',
      });
    }
  }

  // Build dynamic update
  const fields = [];
  const values = [];
  let idx = 1;

  if (role) {
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ code: 'INVALID_ROLE', message: 'Invalid role.' });
    }
    fields.push(`role = $${idx++}`);
    values.push(role);
  }
  if (typeof isActive === 'boolean') {
    fields.push(`is_active = $${idx++}`);
    values.push(isActive);
  }
  if (typeof fullName === 'string' && fullName.trim()) {
    fields.push(`full_name = $${idx++}`);
    values.push(fullName.trim());
  }

  if (!fields.length) {
    return res.status(400).json({
      code: 'NOTHING_TO_UPDATE',
      message: 'Provide role, isActive, or fullName.',
    });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, email, full_name, role, is_active, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    const u = result.rows[0];
    return res.status(200).json({
      user: {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
      },
    });
  } catch (err) {
    console.error('[users/update] error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not update user.' });
  }
}