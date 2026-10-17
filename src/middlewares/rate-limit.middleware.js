'use strict';

/**
 * Rate Limiting Middleware (Section 5.3 & NFR-6)
 * Enforces 100 requests per 10 seconds per IP on /api/v1/*.
 * Explicitly exempts /health and /audit/v1/* from rate limits.
 */

const { APP_CONSTANTS } = require('../constants/app.constants');
const { ERROR_CODES } = require('../constants/error-codes.constants');

const requestCounts = new Map();

function rateLimiter(req, res, next) {
  const path = req.path || '';

  // Explicitly exempt /health and /audit/v1/*
  if (path === '/health' || path.startsWith('/audit/v1/')) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = APP_CONSTANTS.RATE_LIMIT_WINDOW_MS;
  const maxReqs = APP_CONSTANTS.RATE_LIMIT_MAX_REQUESTS;

  let record = requestCounts.get(clientIp);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    requestCounts.set(clientIp, record);
  } else {
    record.count++;
  }

  if (record.count > maxReqs) {
    const retryAfterMs = Math.max(0, windowMs - (now - record.startTime));
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests. Please slow down.',
        details: { retry_after_ms: retryAfterMs },
      },
    });
  }

  next();
}

module.exports = {
  rateLimiter,
};
