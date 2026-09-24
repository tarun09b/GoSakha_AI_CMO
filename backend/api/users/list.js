// backend/api/users/list.js — GET /api/users
import { pool } from '../../db/pool.js';

export async function listUsersHandler(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, email_verified, last_login_at, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      users: result.rows.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        isActive: u.is_active,
        emailVerified: u.email_verified,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
      total: result.rowCount,
    });
  } catch (err) {
    console.error('[users/list] error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not load users.',
    });
  }
}