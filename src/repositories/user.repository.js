'use strict';

/**
 * User & Account Data Repository
 * Handles all database operations for the `users` table.
 */

const db = require('../config/database');

class UserRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findByEmail(email, client = null) {
    const res = await this.query(
      `SELECT user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id, created_at
       FROM users 
       WHERE email = $1`,
      [email.trim().toLowerCase()],
      client
    );
    return res.rows[0] || null;
  }

  static async findById(userId, client = null) {
    const res = await this.query(
      `SELECT user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id, created_at
       FROM users 
       WHERE user_id = $1`,
      [userId],
      client
    );
    return res.rows[0] || null;
  }

  static async findDemoUsers(client = null) {
    const res = await this.query(
      `SELECT user_id, email, role, tenant_id, league_id, club_id, player_id 
       FROM users 
       WHERE email IN ('admin@nascon.test', 'organizer@nascon.test', 'manager@nascon.test', 'player@nascon.test', 'viewer@nascon.test')`,
      [],
      client
    );
    return res.rows;
  }

  static async create(user, client = null) {
    const res = await this.query(
      `INSERT INTO users (user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, email, role, tenant_id, league_id, club_id, player_id, created_at`,
      [
        user.user_id,
        user.email.trim().toLowerCase(),
        user.password_hash,
        user.role,
        user.tenant_id || null,
        user.league_id || null,
        user.club_id || null,
        user.player_id || null,
      ],
      client
    );
    return res.rows[0];
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM users', [], client);
  }
}

module.exports = {
  UserRepository,
};
