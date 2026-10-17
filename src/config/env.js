'use strict';

/**
 * Centralized Environment Configuration
 * Safely resolves and validates environment variables.
 */

const fs = require('fs');
const path = require('path');

function readEnvFileFallback() {
  const envMap = {};
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && val) {
            envMap[key] = val;
          }
        }
      }
    }
  } catch (_) {
    // Ignore read errors
  }
  return envMap;
}

const fileEnv = readEnvFileFallback();

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || fileEnv.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT || fileEnv.PORT || '8080', 10),
  DAY1_SALT: process.env.DAY1_SALT || fileEnv.DAY1_SALT || '',
  JWT_SECRET: process.env.JWT_SECRET || fileEnv.JWT_SECRET || process.env.DAY1_SALT || fileEnv.DAY1_SALT || 'nascon-secret-key-2026',

  // PostgreSQL
  POSTGRES_USER: process.env.POSTGRES_USER || fileEnv.POSTGRES_USER || 'nascon',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || fileEnv.POSTGRES_PASSWORD || 'nascon_password',
  POSTGRES_HOST: process.env.POSTGRES_HOST || fileEnv.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || fileEnv.POSTGRES_PORT || '5432', 10),
  POSTGRES_DB: process.env.POSTGRES_DB || fileEnv.POSTGRES_DB || 'nascon_db',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    fileEnv.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || fileEnv.POSTGRES_USER || 'nascon'}:${process.env.POSTGRES_PASSWORD || fileEnv.POSTGRES_PASSWORD || 'nascon_password'}@${process.env.POSTGRES_HOST || fileEnv.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || fileEnv.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || fileEnv.POSTGRES_DB || 'nascon_db'}`,

  // Redis
  REDIS_URL: process.env.REDIS_URL || fileEnv.REDIS_URL || 'redis://localhost:6379',

  // MinIO Object Store
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || fileEnv.MINIO_ENDPOINT || 'localhost',
  MINIO_PORT: parseInt(process.env.MINIO_PORT || fileEnv.MINIO_PORT || '9000', 10),
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || fileEnv.MINIO_ROOT_USER || 'minioadmin',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || fileEnv.MINIO_ROOT_PASSWORD || 'minioadmin',
  MINIO_BUCKET: process.env.MINIO_BUCKET || fileEnv.MINIO_BUCKET || 'nascon-receipts',
});

module.exports = {
  env,
};
