// run-migrations.js — applies all .sql files in ./migrations in order
import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`▶ Applying ${file} ...`);
    try {
      await pool.query(sql);
      console.log(`  ✅ ${file} applied.`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`);
      console.error(`     ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }

  await pool.end();
  console.log('\nDone.');
}

run();