// seed-founder.js — creates the first Founder user in Supabase
import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { pool } from './db/pool.js';
import { hashPassword, validatePasswordStrength } from './auth/password.js';

const rl = readline.createInterface({ input, output });

async function seedFounder() {
  console.log('\n=== Create first Founder user ===\n');

  const email = (await rl.question('Email: ')).trim().toLowerCase();
  if (!email.includes('@')) {
    console.error('❌ Invalid email.');
    process.exit(1);
  }

  const fullName = (await rl.question('Full name: ')).trim();
  if (!fullName) {
    console.error('❌ Full name cannot be empty.');
    process.exit(1);
  }

  const password = await rl.question('Password: ');
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    console.error(`❌ Weak password: ${strength.reason}`);
    process.exit(1);
  }

  const confirm = await rl.question('Confirm password: ');
  if (confirm !== password) {
    console.error('❌ Passwords do not match.');
    process.exit(1);
  }

  rl.close();

  // Check if user already exists
  const existing = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existing.rows.length > 0) {
    console.error(`❌ A user with email "${email}" already exists.`);
    await pool.end();
    process.exit(1);
  }

  console.log('\nHashing password...');
  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
     VALUES ($1, $2, $3, 'Founder', TRUE, TRUE)
     RETURNING id, email, full_name, role, created_at`,
    [email, passwordHash, fullName]
  );

  const user = result.rows[0];
  console.log('\n✅ Founder user created:');
  console.log(`   ID:        ${user.id}`);
  console.log(`   Email:     ${user.email}`);
  console.log(`   Name:      ${user.full_name}`);
  console.log(`   Role:      ${user.role}`);
  console.log(`   Created:   ${user.created_at}`);

  await pool.end();
}

seedFounder().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});