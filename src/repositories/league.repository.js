'use strict';

/**
 * League Data Repository
 * Handles all database operations for the `leagues` table.
 */

const db = require('../config/database');

class LeagueRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findById(leagueId, client = null) {
    const res = await this.query(
      'SELECT league_id, tenant_id, sport_id, name, config, created_at FROM leagues WHERE league_id = $1',
      [leagueId],
      client
    );
    return res.rows[0] || null;
  }

  static async findByTenantId(tenantId, client = null) {
    const res = await this.query(
      'SELECT league_id, tenant_id, sport_id, name, config, created_at FROM leagues WHERE tenant_id = $1 ORDER BY league_id ASC',
      [tenantId],
      client
    );
    return res.rows;
  }

  static async findBaselineLeagues(client = null) {
    const res = await this.query(
      `SELECT league_id FROM leagues WHERE league_id IN ('league-alpha-1', 'league-alpha-2', 'league-beta-1')`,
      [],
      client
    );
    return res.rows;
  }

  static async create(league, client = null) {
    const configJson = typeof league.config === 'string' ? league.config : JSON.stringify(league.config || {});
    const res = await this.query(
      `INSERT INTO leagues (league_id, tenant_id, sport_id, name, config)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (league_id) DO UPDATE SET 
         tenant_id = EXCLUDED.tenant_id,
         sport_id = EXCLUDED.sport_id,
         name = EXCLUDED.name,
         config = EXCLUDED.config
       RETURNING league_id, tenant_id, sport_id, name, config, created_at`,
      [league.league_id, league.tenant_id, league.sport_id || null, league.name, configJson],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM leagues', [], client);
  }
}

module.exports = {
  LeagueRepository,
};
