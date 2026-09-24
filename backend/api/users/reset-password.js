// backend/api/users/reset-password.js — POST /api/users/:id/reset-password
// Founder/Admin only: reset another user's password (no current password needed).
import { pool } from '../../db/pool.js';
import { hashPassword, validatePasswordStrength } from '../../auth/password.js';

export async function resetPasswordHandler(req, res) {
  const { id } = req.params;
  const { newPassword } = req.body || {};
  const actorId = req.user?.id;

  if (!actorId) {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Sign in required.' });
  }

  if (id === actorId) {
    return res.status(400).json({
      code: 'USE_SELF_CHANGE',
      message: 'To change your own password, use the "Change password" action.',
    });
  }

  if (typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'newPassword is required.',
    });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ code: 'WEAK_PASSWORD', message: strength.reason });
  }

  try {
    const target = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (target.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    const newHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);

    return res.status(200).json({ ok: true, message: 'Password reset.' });
  } catch (err) {
    console.error('[reset-password] error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not reset password.' });
  }
}