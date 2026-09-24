// server.js — GoSakha AI CMO backend API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { loginHandler } from './api/auth/login.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gosakha-cmo-api', time: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', loginHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
});

// Error handler — catches anything thrown in async handlers
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ code: 'SERVER_ERROR', message: 'Internal server error.' });
});

// Start
app.listen(PORT, () => {
  console.log(`\n✅ GoSakha CMO API running on http://localhost:${PORT}`);
  console.log(`   Health:  GET  http://localhost:${PORT}/api/health`);
  console.log(`   Login:   POST http://localhost:${PORT}/api/auth/login\n`);
});