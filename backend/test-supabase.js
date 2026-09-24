import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  console.log('Connecting to Supabase...');
  try {
    const time = await pool.query('SELECT NOW() as now');
    console.log('✅ Connected at:', time.rows[0].now);

    const info = await pool.query('SELECT current_database() as db, current_user as usr');
    console.log('✅ Database:', info.rows[0].db);
    console.log('✅ User:', info.rows[0].usr);

    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('✅ Tables:', tables.rows.map(r => r.tablename).join(', ') || '(none yet)');

    console.log('\n🎉 Supabase connection is working.');
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
  } finally {
    await pool.end();
  }
}

testConnection();