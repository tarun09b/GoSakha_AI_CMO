// backend/middleware/rate-limits.js
// Reusable rate limiters for sensitive endpoints.
import rateLimit from 'express-rate-limit';

/**
 * Login limiter — prevents brute-force attacks.
 * 5 attempts per 15 minutes per IP. Successful logins are NOT counted.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    code: 'RATE_LIMITED',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

/**
 * General API limiter — broad protection for all routes.
 * 300 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down.',
  },
});