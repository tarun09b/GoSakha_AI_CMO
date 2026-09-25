// backend/services/audit.js
// Central helper for writing to the immutable audit_logs table.
// Every sensitive action in the app must call this.

import { pool } from '../db/pool.js';

/**
 * Write a single audit entry.
 *
 * @param {object} entry
 * @param {object} [entry.req]        - Express req object (used to extract actor, IP, user-agent)
 * @param {string} entry.action       - e.g. 'user.created', 'auth.login'
 * @param {string} [entry.entityType] - e.g. 'user', 'lead'
 * @param {string} [entry.entityId]   - UUID of the affected row
 * @param {object} [entry.metadata]   - small JSON blob (NEVER put passwords/tokens here)
 * @param {'success'|'failure'|'blocked'} [entry.result='success']
 */
export async function audit(entry) {
  const {
    req,
    action,
    entityType = null,
    entityId = null,
    metadata = null,
    result = 'success',
  } = entry;

  // Derive actor from request if available
  const actorId    = req?.user?.id    ?? null;
  const actorEmail = req?.user?.email ?? null;
  const actorRole  = req?.user?.role  ?? null;

  // Extract client info — careful with proxies
  const ip =
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    null;
  const userAgent = req?.headers?.['user-agent']?.slice(0, 300) || null;

  // Scrub common sensitive keys from metadata (defense in depth)
  const safeMetadata = scrubSensitive(metadata);

  try {
    await pool.query(
      `INSERT INTO audit_logs
        (actor_id, actor_email, actor_role, action, entity_type, entity_id, metadata, ip_address, user_agent, result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        actorId,
        actorEmail,
        actorRole,
        action,
        entityType,
        entityId,
        safeMetadata ? JSON.stringify(safeMetadata) : null,
        ip,
        userAgent,
        result,
      ]
    );
  } catch (err) {
    // An audit failure must NOT break the main action, but MUST be logged.
    console.error('[audit] failed to write entry:', err.message, { action, entityType, entityId });
  }
}

// Strip keys that should never end up in logs, even if a caller passes them by mistake.
function scrubSensitive(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata;
  const banned = new Set([
    'password', 'passwordHash', 'password_hash', 'currentPassword',
    'newPassword', 'token', 'jwt', 'secret', 'apiKey', 'api_key',
    'authorization', 'cookie',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (banned.has(k)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = scrubSensitive(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}