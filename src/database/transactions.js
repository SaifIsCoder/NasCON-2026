'use strict';

/**
 * Transaction Safety Utility
 * Executes database operations within an isolated transaction with automatic commit and rollback.
 */

const db = require('../config/database');

/**
 * Execute a unit of work inside an atomic database transaction.
 *
 * @param {Function} workFn - Async function taking (client)
 * @param {import('pg').PoolClient} [existingClient] - Optional existing transaction client
 * @returns {Promise<any>} Result of workFn
 */
async function withTransaction(workFn, existingClient = null) {
  if (existingClient) {
    return workFn(existingClient);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await workFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Suppress rollback errors if connection was dropped
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  withTransaction,
};
