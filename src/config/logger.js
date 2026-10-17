'use strict';

/**
 * Structured Application Logger
 * Suppresses sensitive secrets (passwords, JWT secrets, salts) in logs.
 */

const { env } = require('./env');

const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'salt', 'DAY1_SALT', 'JWT_SECRET', 'token', 'authorization']);

function maskSensitive(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(maskSensitive);
  }
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = maskSensitive(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const logger = {
  info: (msg, meta) => {
    if (env.NODE_ENV !== 'test') {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(maskSensitive(meta)) : '');
    }
  },
  warn: (msg, meta) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(maskSensitive(meta)) : '');
  },
  error: (msg, meta) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(maskSensitive(meta)) : '');
  },
  debug: (msg, meta) => {
    if (env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(maskSensitive(meta)) : '');
    }
  },
};

module.exports = {
  logger,
};
