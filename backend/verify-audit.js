import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const cols = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='audit_logs'
  ORDER BY ordinal_position
`);
console.log('Columns:');
console.table(cols.rows);

const trg = await pool.query(`
  SELECT tgname FROM pg_trigger
  WHERE tgrelid = 'audit_logs'::regclass AND NOT tgisinternal
`);
console.log('Triggers:', trg.rows.map(x => x.tgname).join(', '));

const idx = await pool.query(`
  SELECT indexname FROM pg_indexes
  WHERE schemaname='public' AND tablename='audit_logs'
`);
console.log('Indexes:', idx.rows.map(x => x.indexname).join(', '));

// Prove triggers block update/delete
try {
  await pool.query(`UPDATE audit_logs SET action='tampered' WHERE false`);
  console.log('UPDATE: allowed (no rows, but trigger fired)');
} catch (e) {
  console.log('UPDATE blocked by trigger:', e.message);
}

await pool.end();
