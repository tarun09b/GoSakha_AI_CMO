import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ins = await pool.query(`
  INSERT INTO audit_logs (action, result)
  VALUES ('test.trigger_check', 'success')
  RETURNING id
`);

const testId = ins.rows[0].id;

console.log('Inserted test row:', testId);

try {
  await pool.query(
    `UPDATE audit_logs SET action='tampered' WHERE id=$1`,
    [testId]
  );

  console.log('ERROR: UPDATE was allowed.');
} catch (err) {
  console.log('UPDATE blocked:', err.message);
}

try {
  await pool.query(
    `DELETE FROM audit_logs WHERE id=$1`,
    [testId]
  );

  console.log('ERROR: DELETE was allowed.');
} catch (err) {
  console.log('DELETE blocked:', err.message);
}

const check = await pool.query(
  `SELECT id, action, result FROM audit_logs WHERE id=$1`,
  [testId]
);

console.log('Row still exists:', check.rows[0]);

await pool.end();