'use strict';

/**
 * Fixture & Match Data Repository
 * Handles all database operations for the `matches` table.
 */

const db = require('../config/database');

class FixtureRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findMatchById(matchId, client = null) {
    const res = await this.query(
      `SELECT match_id, sport_id, league_id, home_team_id, away_team_id, status, winner_team_id, tiebreak_winner_team_id, created_at
       FROM matches WHERE match_id = $1`,
      [matchId],
      client
    );
    return res.rows[0] || null;
  }

  static async findMatchByIdForUpdate(matchId, client) {
    const res = await this.query(
      `SELECT match_id, sport_id, league_id, home_team_id, away_team_id, status, winner_team_id, tiebreak_winner_team_id, created_at
       FROM matches WHERE match_id = $1 FOR UPDATE`,
      [matchId],
      client
    );
    return res.rows[0] || null;
  }

  static async createMatch(match, client = null) {
    const res = await this.query(
      `INSERT INTO matches (match_id, sport_id, league_id, home_team_id, away_team_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING match_id, sport_id, league_id, home_team_id, away_team_id, status, created_at`,
      [
        match.match_id,
        match.sport_id,
        match.league_id || null,
        match.home_team_id,
        match.away_team_id,
        match.status || 'upcoming',
      ],
      client
    );
    return res.rows[0];
  }

  static async updateMatchStatus(matchId, status, client = null) {
    const res = await this.query(
      `UPDATE matches SET status = $1 WHERE match_id = $2 RETURNING match_id, status`,
      [status, matchId],
      client
    );
    return res.rows[0] || null;
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM matches', [], client);
  }
}

module.exports = {
  FixtureRepository,
};
