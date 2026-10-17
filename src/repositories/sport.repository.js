'use strict';

/**
 * Sport Data Repository
 * Handles all database operations for the `sports` table.
 */

const db = require('../config/database');

class SportRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findById(sportId, client = null) {
    const res = await this.query(
      'SELECT sport_id, name, scoring_model, config, created_at FROM sports WHERE sport_id = $1',
      [sportId],
      client
    );
    return res.rows[0] || null;
  }

  static async findAll(client = null) {
    const res = await this.query(
      'SELECT sport_id, name, scoring_model, config, created_at FROM sports ORDER BY sport_id ASC',
      [],
      client
    );
    return res.rows;
  }

  static async findBaselineSports(client = null) {
    const res = await this.query(
      `SELECT sport_id FROM sports WHERE sport_id IN ('football', 'basketball', 'cricket', 'esports')`,
      [],
      client
    );
    return res.rows;
  }

  static async create(sport, client = null) {
    const configJson = typeof sport.config === 'string' ? sport.config : JSON.stringify(sport.config);
    const res = await this.query(
      `INSERT INTO sports (sport_id, name, scoring_model, config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sport_id) DO UPDATE SET 
         name = EXCLUDED.name,
         scoring_model = EXCLUDED.scoring_model,
         config = EXCLUDED.config
       RETURNING sport_id, name, scoring_model, config, created_at`,
      [sport.sport_id, sport.name, sport.scoring_model, configJson],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM sports', [], client);
  }
}

module.exports = {
  SportRepository,
};
