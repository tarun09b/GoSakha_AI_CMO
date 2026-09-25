// server.js — GoSakha AI CMO backend API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loginHandler } from './api/auth/login.js';
import { requireAuth } from './auth/jwt.js';
import { requireRole } from './middleware/require-role.js';
import { listUsersHandler } from './api/users/list.js';
import { createUserHandler } from './api/users/create.js';
import { deleteUserHandler } from './api/users/delete.js';
import { updateUserHandler } from './api/users/update.js';
import { loginLimiter, apiLimiter } from './middleware/rate-limits.js';
import { changePasswordHandler } from './api/auth/change-password.js';
import { resetPasswordHandler } from './api/users/reset-password.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Middleware
app.use(helmet());
const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no Origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gosakha-cmo-api', time: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', loginLimiter, loginHandler);
// User management — Founder/Admin only
app.get('/api/users',       requireAuth, requireRole(), listUsersHandler);
app.post('/api/users',      requireAuth, requireRole(), createUserHandler);
app.patch('/api/users/:id', requireAuth, requireRole(), updateUserHandler);
app.delete('/api/users/:id', requireAuth, requireRole(), deleteUserHandler);
// Self-service password change
app.patch('/api/auth/change-password', requireAuth, changePasswordHandler);

// Admin password reset for another user
app.post('/api/users/:id/reset-password', requireAuth, requireRole(), resetPasswordHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
});

// Error handler — catches anything thrown in async handlers
app.use((err, req, res, next) => {
  // Honor explicit status codes set by middleware (e.g. body-parser 413, cors 403)
  const status = err.status || err.statusCode || 500;
  // Payload too large (from express.json limit)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large. Limit is 100 KB.',
    });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      code: 'INVALID_JSON',
      message: 'Request body is not valid JSON.',
    });
  }
  // CORS rejection
  if (typeof err.message === 'string' && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      code: 'CORS_BLOCKED',
      message: 'Origin not allowed.',
    });
  }
  // Fallback
  console.error('[server] unhandled error:', err);
  res.status(status).json({
    code: status === 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR',
    message: status === 500 ? 'Internal server error.' : err.message || 'Request failed.',
  });
});

// Start
app.listen(PORT, () => {
  console.log(`\n✅ GoSakha CMO API running on http://localhost:${PORT}`);
  console.log(`   Health:  GET  http://localhost:${PORT}/api/health`);
  console.log(`   Login:   POST http://localhost:${PORT}/api/auth/login\n`);
});