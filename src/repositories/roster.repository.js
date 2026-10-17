'use strict';

/**
 * Club & Roster Player Repository (Section 5.11, 5.13)
 * Handles database operations for `clubs` and `players`.
 */

const db = require('../config/database');

class RosterRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findClubById(clubId, client = null) {
    const res = await this.query(
      'SELECT club_id, tenant_id, name, created_at FROM clubs WHERE club_id = $1',
      [clubId],
      client
    );
    return res.rows[0] || null;
  }

  static async findPlayerById(playerId, client = null) {
    const res = await this.query(
      'SELECT player_id, club_id, tenant_id, name, position, created_at FROM players WHERE player_id = $1',
      [playerId],
      client
    );
    return res.rows[0] || null;
  }

  static async findPlayersByClubId(clubId, client = null) {
    const res = await this.query(
      'SELECT player_id, club_id, tenant_id, name, position, created_at FROM players WHERE club_id = $1 ORDER BY player_id ASC',
      [clubId],
      client
    );
    return res.rows;
  }

  static async findBaselineClubs(client = null) {
    const res = await this.query(
      `SELECT club_id FROM clubs WHERE club_id IN ('club-alpha-1', 'club-alpha-2', 'club-beta-1')`,
      [],
      client
    );
    return res.rows;
  }

  static async findBaselinePlayers(client = null) {
    const res = await this.query(
      `SELECT player_id FROM players WHERE player_id IN ('player-alpha-1', 'player-alpha-2', 'player-beta-1')`,
      [],
      client
    );
    return res.rows;
  }

  static async createClub(club, client = null) {
    const res = await this.query(
      `INSERT INTO clubs (club_id, tenant_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (club_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name
       RETURNING club_id, tenant_id, name, created_at`,
      [club.club_id, club.tenant_id, club.name],
      client
    );
    return res.rows[0];
  }

  static async createPlayer(player, client = null) {
    const res = await this.query(
      `INSERT INTO players (player_id, club_id, tenant_id, name, position)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (player_id) DO UPDATE SET 
         club_id = EXCLUDED.club_id,
         tenant_id = EXCLUDED.tenant_id,
         name = EXCLUDED.name,
         position = EXCLUDED.position
       RETURNING player_id, club_id, tenant_id, name, position, created_at`,
      [player.player_id, player.club_id || null, player.tenant_id, player.name, player.position || null],
      client
    );
    return res.rows[0];
  }

  static async updatePlayer(playerId, updates = {}, client = null) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }
    if (updates.position !== undefined) {
      fields.push(`position = $${idx++}`);
      values.push(updates.position);
    }
    if (updates.club_id !== undefined) {
      fields.push(`club_id = $${idx++}`);
      values.push(updates.club_id);
    }

    if (fields.length === 0) {
      return this.findPlayerById(playerId, client);
    }

    values.push(playerId);
    const res = await this.query(
      `UPDATE players SET ${fields.join(', ')} WHERE player_id = $${idx} RETURNING player_id, club_id, tenant_id, name, position`,
      values,
      client
    );
    return res.rows[0] || null;
  }

  static async deleteAllClubs(client = null) {
    return this.query('DELETE FROM clubs', [], client);
  }

  static async deleteAllPlayers(client = null) {
    return this.query('DELETE FROM players', [], client);
  }
}

module.exports = {
  RosterRepository,
};
