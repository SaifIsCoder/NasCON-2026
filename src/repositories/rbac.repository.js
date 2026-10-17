'use strict';

/**
 * RBAC & System Audit State Repository
 * Handles queries on `audit_reset_state` and RBAC context lookup.
 */

const db = require('../config/database');

class RbacRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async getAuditResetState(client = null) {
    const res = await this.query('SELECT id, seed, reset_at FROM audit_reset_state WHERE id = 1', [], client);
    return res.rows[0] || null;
  }

  static async setAuditResetState(seed = 42, client = null) {
    const res = await this.query(
      `INSERT INTO audit_reset_state (id, seed, reset_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET seed = EXCLUDED.seed, reset_at = NOW()
       RETURNING id, seed, reset_at`,
      [seed],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM audit_reset_state', [], client);
  }
}

module.exports = {
  RbacRepository,
};
