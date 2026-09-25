import { audit } from './services/audit.js';
import { pool } from './db/pool.js';

// Fake req object resembling Express
const fakeReq = {
  user: { id: null, email: 'test@example.com', role: 'Founder' },
  headers: { 'user-agent': 'verify-audit-script/1.0' },
  socket: { remoteAddress: '127.0.0.1' },
};

await audit({
  req: fakeReq,
  action: 'audit.self_test',
  entityType: 'system',
  metadata: {
    password: 'SHOULD_BE_REDACTED',
    note: 'verify audit helper works',
  },
  result: 'success',
});

const r = await pool.query(`
  SELECT action, actor_email, metadata, ip_address, user_agent, result
  FROM audit_logs
  ORDER BY occurred_at DESC
  LIMIT 1
`);
console.log(r.rows[0]);

await pool.end(); 