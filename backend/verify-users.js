import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const result = await pool.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
  ORDER BY ordinal_position
`);

console.log('users table columns:');
console.table(result.rows);

const count = await pool.query('SELECT COUNT(*) FROM users');
console.log('\nRow count:', count.rows[0].count);

await pool.end();