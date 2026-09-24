// auth/jwt.js — sign and verify JWT session tokens
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set in .env and be at least 32 characters.');
}

/**
 * Sign a new token for a logged-in user.
 * Keep the payload small — only what the frontend needs to identify the user.
 */
export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/**
 * Verify a token. Returns the payload if valid, throws otherwise.
 */
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/**
 * Express middleware — protects routes that require login.
 * Attaches req.user = { id, email, role } if the token is valid.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Missing bearer token.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token.' });
  }
}