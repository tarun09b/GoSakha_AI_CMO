import 'dotenv/config';
import { verifyToken } from './auth/jwt.js';

const token = process.argv[2];
if (!token) {
  console.error('Usage: node test-token.js <jwt>');
  process.exit(1);
}

try {
  const payload = verifyToken(token);
  console.log('✅ Token valid:');
  console.log(payload);
} catch (err) {
  console.error('❌ Token invalid:', err.message);
}