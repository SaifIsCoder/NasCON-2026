'use strict';

/**
 * PostgreSQL Database Connection Pool & Migration Utility
 * Centralizes connection pooling, query execution, and schema migrations.
 */

const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
const { env } = require('./env');

// Return DATE columns (OID 1082) as plain 'YYYY-MM-DD' strings instead of
// local-midnight Date objects, so date-only comparisons and responses are
// timezone-independent (inclusive transfer-window boundaries must be exact).
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Execute a query with optional parameters
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Acquire a client for transaction management
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run database migrations
 */
async function migrate() {
  let schemaPath = path.join(__dirname, '../database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '../db/schema.sql');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  await pool.query(
    "INSERT INTO schema_migrations (version) VALUES ('20261017_baseline_schema') ON CONFLICT DO NOTHING"
  );
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
