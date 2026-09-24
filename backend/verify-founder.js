import 'dotenv/config';
import { pool } from './db/pool.js';
import { verifyPassword } from './auth/password.js';

const result = await pool.query(
  'SELECT id, email, full_name, role, password_hash, is_active FROM users ORDER BY created_at DESC LIMIT 1'
);

if (result.rows.length === 0) {
  console.log('No users found.');
  process.exit(0);
}

const u = result.rows[0];
console.log('Latest user:');
console.log(`  ID:            ${u.id}`);
console.log(`  Email:         ${u.email}`);
console.log(`  Full name:     ${u.full_name}`);
console.log(`  Role:          ${u.role}`);
console.log(`  Active:        ${u.is_active}`);
console.log(`  Password hash: ${u.password_hash.slice(0, 30)}... (length ${u.password_hash.length})`);

// Prove the hash matches the password you entered
const testPassword = process.argv[2];
if (testPassword) {
  const ok = await verifyPassword(testPassword, u.password_hash);
  console.log(`\nPassword check for "${testPassword}": ${ok ? '✅ MATCH' : '❌ NO MATCH'}`);
}

await pool.end();