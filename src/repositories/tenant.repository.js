'use strict';

/**
 * Tenant Data Repository
 * Handles all database operations for the `tenants` table.
 */

const db = require('../config/database');

class TenantRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findById(tenantId, client = null) {
    const res = await this.query(
      'SELECT tenant_id, name, created_at FROM tenants WHERE tenant_id = $1',
      [tenantId],
      client
    );
    return res.rows[0] || null;
  }

  static async findAll(client = null) {
    const res = await this.query('SELECT tenant_id, name, created_at FROM tenants ORDER BY tenant_id ASC', [], client);
    return res.rows;
  }

  static async findBaselineTenants(client = null) {
    const res = await this.query(
      `SELECT tenant_id, name FROM tenants WHERE tenant_id IN ('tenant-alpha', 'tenant-beta')`,
      [],
      client
    );
    return res.rows;
  }

  static async create(tenant, client = null) {
    const res = await this.query(
      'INSERT INTO tenants (tenant_id, name) VALUES ($1, $2) RETURNING tenant_id, name, created_at',
      [tenant.tenant_id, tenant.name],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM tenants', [], client);
  }
}

module.exports = {
  TenantRepository,
};
