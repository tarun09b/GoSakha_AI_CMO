// backend/api/users/create.js — POST /api/users
import { pool } from '../../db/pool.js';
import { hashPassword, validatePasswordStrength } from '../../auth/password.js';

const ALLOWED_ROLES = ['Founder', 'Admin', 'CMO', 'Sales', 'Content Reviewer', 'Viewer'];

export async function createUserHandler(req, res) {
  const { email, password, fullName, role } = req.body || {};

  // 1. Validate input
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'email, password, fullName, and role are all required.',
    });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({
      code: 'INVALID_ROLE',
      message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Invalid email.' });
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return res.status(400).json({ code: 'WEAK_PASSWORD', message: strength.reason });
  }

  try {
    // 2. Reject duplicates
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        code: 'EMAIL_TAKEN',
        message: 'A user with that email already exists.',
      });
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Insert
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       RETURNING id, email, full_name, role, is_active, created_at`,
      [email.trim().toLowerCase(), passwordHash, fullName.trim(), role]
    );

    const u = result.rows[0];
    return res.status(201).json({
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
    console.error('[users/create] error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Could not create user.',
    });
  }
}