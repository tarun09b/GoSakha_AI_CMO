import 'dotenv/config';
import { pool } from './db/pool.js';

// For single-message threads, the thread_id equals the message_id
// Update all sent drafts where thread_id is null
const r = await pool.query(`
  UPDATE email_drafts
  SET gmail_thread_id = gmail_message_id
  WHERE status = 'sent'
    AND gmail_message_id IS NOT NULL
    AND gmail_thread_id IS NULL
  RETURNING id, gmail_message_id, gmail_thread_id
`);

console.log(`Backfilled ${r.rowCount} drafts:`);
console.table(r.rows);

await pool.end();