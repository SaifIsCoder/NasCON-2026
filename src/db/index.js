'use strict';

/**
 * PostgreSQL Database Connection Pool & Migration Utility
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'nascon'}:${process.env.POSTGRES_PASSWORD || 'nascon_password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'nascon_db'}`;

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Execute a query with optional parameters
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Acquire a client for transaction management
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run database migrations
 */
async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
}

/**
 * Close database pool
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  migrate,
  close,
};
