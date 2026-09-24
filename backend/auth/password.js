// auth/password.js — bcrypt password hashing utilities
import * as bcrypt from 'bcrypt';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

/**
 * Hash a plain-text password.
 * Never store the plain version — always store the returned hash.
 */
export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length < 8) {
    throw new Error('Password must be a string of at least 8 characters.');
  }
  return bcrypt.hash(plainPassword, ROUNDS);
}

/**
 * Compare a plain-text password against a stored hash.
 * Returns true if they match, false otherwise.
 * Never throws on mismatch — only on bad input.
 */
export async function verifyPassword(plainPassword, storedHash) {
  if (typeof plainPassword !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(plainPassword, storedHash);
  } catch {
    return false;
  }
}

/**
 * Basic password strength check — used before hashing.
 * Returns { valid: boolean, reason?: string }.
 */
export function validatePasswordStrength(plainPassword) {
  if (typeof plainPassword !== 'string') {
    return { valid: false, reason: 'Password must be a string.' };
  }
  if (plainPassword.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(plainPassword)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(plainPassword)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(plainPassword)) {
    return { valid: false, reason: 'Password must contain at least one number.' };
  }
  return { valid: true };
}