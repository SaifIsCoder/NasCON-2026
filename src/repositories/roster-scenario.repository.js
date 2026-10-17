'use strict';

/**
 * Roster Scenario Repository (Section 5.11)
 * Persistence for scenario leagues, squads, player registrations, the
 * immutable audit trail, transfer-request idempotency and in-progress matches.
 * Kept separate from roster.repository.js (which backs the RBAC clubs/players).
 */

const db = require('../config/database');

class RosterScenarioRepository {
  static q(text, params, client = null) {
    return (client || db).query(text, params);
  }

  // ---- scenario reset (replace a league's roster state) --------------------
  static async clearLeague(leagueId, client) {
    await this.q('DELETE FROM roster_live_matches WHERE league_id = $1', [leagueId], client);
    await this.q('DELETE FROM roster_registrations WHERE league_id = $1', [leagueId], client);
    await this.q('DELETE FROM roster_squads WHERE league_id = $1', [leagueId], client);
    await this.q('DELETE FROM roster_audit WHERE league_id = $1', [leagueId], client);
    await this.q('DELETE FROM roster_transfer_requests WHERE league_id = $1', [leagueId], client);
    await this.q('DELETE FROM roster_leagues WHERE league_id = $1', [leagueId], client);
  }

  // ---- leagues -------------------------------------------------------------
  static async createLeague(l, client) {
    await this.q(
      `INSERT INTO roster_leagues (league_id, tenant_id, sport_id, transfer_open, transfer_close, max_squad_size, required_positions)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [l.league_id, l.tenant_id, l.sport_id || null, l.transfer_open || null, l.transfer_close || null, l.max_squad_size, JSON.stringify(l.required_positions || {})],
      client
    );
  }

  static async findLeague(leagueId, client = null) {
    const r = await this.q('SELECT * FROM roster_leagues WHERE league_id = $1', [leagueId], client);
    return r.rows[0] || null;
  }

  // ---- squads --------------------------------------------------------------
  static async createSquad(s, client) {
    await this.q(
      `INSERT INTO roster_squads (league_id, squad_id, club_id, tenant_id, name) VALUES ($1,$2,$3,$4,$5)`,
      [s.league_id, s.squad_id, s.club_id || null, s.tenant_id, s.name || null],
      client
    );
  }

  static async findSquad(leagueId, squadId, client = null) {
    const r = await this.q('SELECT * FROM roster_squads WHERE league_id = $1 AND squad_id = $2', [leagueId, squadId], client);
    return r.rows[0] || null;
  }

  // ---- registrations -------------------------------------------------------
  static async upsertRegistration(reg, client) {
    await this.q(
      `INSERT INTO roster_registrations (league_id, player_id, name, position, squad_id, parent_squad_id, role, registration_type, start_date, loan_end_date, on_loan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (league_id, player_id) DO UPDATE SET
         name = EXCLUDED.name, position = EXCLUDED.position, squad_id = EXCLUDED.squad_id,
         parent_squad_id = EXCLUDED.parent_squad_id, role = EXCLUDED.role,
         registration_type = EXCLUDED.registration_type, start_date = EXCLUDED.start_date,
         loan_end_date = EXCLUDED.loan_end_date, on_loan = EXCLUDED.on_loan`,
      [reg.league_id, reg.player_id, reg.name || null, reg.position || null, reg.squad_id || null,
        reg.parent_squad_id || null, reg.role || null, reg.registration_type || null,
        reg.start_date || null, reg.loan_end_date || null, !!reg.on_loan],
      client
    );
  }

  static async findRegistrationByPlayer(playerId, client = null) {
    const r = await this.q('SELECT * FROM roster_registrations WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1', [playerId], client);
    return r.rows[0] || null;
  }

  static async findRegistration(leagueId, playerId, client = null) {
    const r = await this.q('SELECT * FROM roster_registrations WHERE league_id = $1 AND player_id = $2', [leagueId, playerId], client);
    return r.rows[0] || null;
  }

  static async countSquadMembers(leagueId, squadId, client = null) {
    const r = await this.q('SELECT COUNT(*)::int AS n FROM roster_registrations WHERE league_id = $1 AND squad_id = $2', [leagueId, squadId], client);
    return r.rows[0].n;
  }

  static async squadPositionCount(leagueId, squadId, position, client = null) {
    const r = await this.q(
      'SELECT COUNT(*)::int AS n FROM roster_registrations WHERE league_id = $1 AND squad_id = $2 AND position = $3',
      [leagueId, squadId, position],
      client
    );
    return r.rows[0].n;
  }

  // ---- audit ---------------------------------------------------------------
  static async countAudit(leagueId, client = null) {
    const r = await this.q('SELECT COUNT(*)::int AS n FROM roster_audit WHERE league_id = $1', [leagueId], client);
    return r.rows[0].n;
  }

  static async insertAudit(a, client) {
    await this.q(
      `INSERT INTO roster_audit (audit_id, league_id, player_id, action, from_squad_id, to_squad_id, effective_date, state, who, why, entry)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [a.audit_id, a.league_id, a.player_id, a.action, a.from_squad_id || null, a.to_squad_id || null,
        a.effective_date || null, a.state || null, a.who || null, a.why || null, JSON.stringify(a.entry)],
      client
    );
  }

  static async findAuditByPlayer(playerId, client = null) {
    const r = await this.q('SELECT * FROM roster_audit WHERE player_id = $1 ORDER BY id ASC', [playerId], client);
    return r.rows;
  }

  static async hasLoanReturn(leagueId, playerId, startDate, client = null) {
    const r = await this.q(
      "SELECT 1 FROM roster_audit WHERE league_id = $1 AND player_id = $2 AND action = 'loan_return' AND effective_date = $3 LIMIT 1",
      [leagueId, playerId, startDate],
      client
    );
    return r.rowCount > 0;
  }

  // ---- idempotency ---------------------------------------------------------
  static async findRequest(requestId, client = null) {
    const r = await this.q('SELECT * FROM roster_transfer_requests WHERE request_id = $1', [requestId], client);
    return r.rows[0] || null;
  }

  static async saveRequest(requestId, leagueId, body, response, statusCode, client) {
    await this.q(
      `INSERT INTO roster_transfer_requests (request_id, league_id, request_body, response, status_code)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (request_id) DO NOTHING`,
      [requestId, leagueId, JSON.stringify(body), JSON.stringify(response), statusCode],
      client
    );
  }

  // ---- live matches --------------------------------------------------------
  static async createLiveMatch(m, client) {
    await this.q(
      `INSERT INTO roster_live_matches (league_id, match_id, home_squad_id, away_squad_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (league_id, match_id) DO NOTHING`,
      [m.league_id, m.match_id, m.home_squad_id || null, m.away_squad_id || null],
      client
    );
  }

  static async findLiveMatchForSquad(leagueId, squadId, client = null) {
    const r = await this.q(
      'SELECT * FROM roster_live_matches WHERE league_id = $1 AND (home_squad_id = $2 OR away_squad_id = $2) LIMIT 1',
      [leagueId, squadId],
      client
    );
    return r.rows[0] || null;
  }
}

module.exports = { RosterScenarioRepository };
