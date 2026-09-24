// api/auth/login.js — POST /api/auth/login
import { pool } from '../../db/pool.js';
import { verifyPassword } from '../../auth/password.js';
import { signToken } from '../../auth/jwt.js';

export async function loginHandler(req, res) {
  const { email, password } = req.body || {};

  // 1. Basic input validation — fail closed
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Email and password are required.',
    });
  }

  try {
    // 2. Look up user by email (case-insensitive)
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    // 3. Generic error on failure — never reveal whether the email exists
    const GENERIC = {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    };

    if (result.rows.length === 0) {
      return res.status(401).json(GENERIC);
    }

    const user = result.rows[0];

    // 4. Block inactive accounts
    if (!user.is_active) {
      return res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled. Contact an administrator.',
      });
    }

    // 5. Verify password against the stored bcrypt hash
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json(GENERIC);
    }

    // 6. Update last_login_at (best-effort, doesn't block login)
    pool
      .query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])
      .catch((err) => console.error('[login] last_login_at update failed:', err.message));

    // 7. Sign and return a JWT
    const token = signToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[login] unexpected error:', err.message);
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Try again in a moment.',
    });
  }
}