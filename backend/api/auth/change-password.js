// backend/api/auth/change-password.js — PATCH /api/auth/change-password
// Self-service: the signed-in user changes their own password.
import { pool } from '../../db/pool.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../auth/password.js';

export async function changePasswordHandler(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Sign in required.' });
  }

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'currentPassword and newPassword are required.',
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      code: 'SAME_PASSWORD',
      message: 'New password must be different from the current password.',
    });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ code: 'WEAK_PASSWORD', message: strength.reason });
  }

  try {
    // 1. Load current hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    // 2. Verify current password
    const ok = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect.',
      });
    }

    // 3. Hash the new password and save
    const newHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    return res.status(200).json({ ok: true, message: 'Password updated.' });
  } catch (err) {
    console.error('[change-password] error:', err.message);
    return res.status(500).json({ code: 'SERVER_ERROR', message: 'Could not update password.' });
  }
}