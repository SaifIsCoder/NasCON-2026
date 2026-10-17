'use strict';

/**
 * Roster, Transfers, Loans & History Service (Section 5.11)
 */

const { RosterScenarioRepository: Repo } = require('../repositories/roster-scenario.repository');
const { SportRepository } = require('../repositories/sport.repository');
const { RosterValidator } = require('../validators/roster.validator');
const { withTransaction } = require('../database/transactions');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

const DEFAULT_TENANT = 'tenant-alpha';

const toDateStr = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};
const dayAfter = (dateStr) => {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
};
const padAudit = (n) => `au-${String(n).padStart(4, '0')}`;

class RosterService {
  // ---- POST /audit/v1/roster/setup ---------------------------------------
  static async setupRoster(body) {
    const { league, squads, players, matches_in_progress } = RosterValidator.validateSetup(body);

    return withTransaction(async (client) => {
      const leagueId = league.league_id;

      // Defaults from the sport's roster config when omitted
      let maxSquad = league.max_squad_size;
      let requiredPositions = league.required_positions;
      const sportId = league.sport_id || null;
      if ((maxSquad === undefined || requiredPositions === undefined) && sportId) {
        const sport = await SportRepository.findById(sportId, client);
        if (sport) {
          const cfg = typeof sport.config === 'string' ? JSON.parse(sport.config) : sport.config;
          const r = cfg.roster || {};
          if (maxSquad === undefined) maxSquad = r.max_squad_size;
          if (requiredPositions === undefined) requiredPositions = r.required_positions;
        }
      }

      // Re-sending the same league_id replaces that league's roster state
      await Repo.clearLeague(leagueId, client);

      const tenantId = league.tenant_id || DEFAULT_TENANT;
      const window = league.transfer_window || {};
      await Repo.createLeague({
        league_id: leagueId,
        tenant_id: tenantId,
        sport_id: sportId,
        transfer_open: window.open || null,
        transfer_close: window.close || null,
        max_squad_size: maxSquad === undefined ? null : maxSquad,
        required_positions: requiredPositions || {},
      }, client);

      for (const s of squads) {
        await Repo.createSquad({
          league_id: leagueId,
          squad_id: s.squad_id,
          club_id: s.club_id,
          tenant_id: s.tenant_id || tenantId,
          name: s.name,
        }, client);
      }

      for (const p of players) {
        await Repo.upsertRegistration({
          league_id: leagueId,
          player_id: p.player_id,
          name: p.name,
          position: p.position,
          squad_id: p.squad_id || null,
          parent_squad_id: null,
          role: p.role || 'substitute',
          registration_type: 'initial',
          start_date: null,
          loan_end_date: null,
          on_loan: false,
        }, client);
      }

      for (const m of matches_in_progress) {
        await Repo.createLiveMatch({
          league_id: leagueId,
          match_id: m.match_id,
          home_squad_id: m.home_squad_id,
          away_squad_id: m.away_squad_id,
        }, client);
      }

      const squad_counts = {};
      for (const s of squads) {
        squad_counts[s.squad_id] = await Repo.countSquadMembers(leagueId, s.squad_id, client);
      }

      return {
        statusCode: 201,
        data: { league_id: leagueId, status: 'configured', squad_counts },
      };
    });
  }

  // ---- POST /audit/v1/roster/transfer ------------------------------------
  static async transferPlayer(body) {
    const t = RosterValidator.validateTransfer(body); // check #1

    return withTransaction(async (client) => {
      // Idempotency: replay of a previously-accepted request -> 200 with stored response
      const prior = await Repo.findRequest(t.request_id, client);
      if (prior) {
        return { statusCode: 200, data: typeof prior.response === 'string' ? JSON.parse(prior.response) : prior.response };
      }

      // Check #2: league / player / squads exist
      const league = await Repo.findLeague(t.league_id, client);
      if (!league) throw new ApiError(404, ERROR_CODES.LEAGUE_NOT_FOUND, `League ${t.league_id} not found.`);

      const reg = await Repo.findRegistration(t.league_id, t.player_id, client);
      if (!reg) throw new ApiError(404, ERROR_CODES.PLAYER_NOT_FOUND, `Player ${t.player_id} not found.`);

      const fromSquadId = t.from_squad_id || reg.squad_id;
      if (fromSquadId) {
        const fromSquad = await Repo.findSquad(t.league_id, fromSquadId, client);
        if (!fromSquad) throw new ApiError(404, ERROR_CODES.SQUAD_NOT_FOUND, `Squad ${fromSquadId} not found.`);
      }
      let toSquad = null;
      if (t.to_squad_id) {
        toSquad = await Repo.findSquad(t.league_id, t.to_squad_id, client);
        if (!toSquad) throw new ApiError(404, ERROR_CODES.SQUAD_NOT_FOUND, `Squad ${t.to_squad_id} not found.`);
      }

      // Check #3: from and to squads belong to the league's tenant
      const leagueTenant = league.tenant_id;
      const fromSquadRow = fromSquadId ? await Repo.findSquad(t.league_id, fromSquadId, client) : null;
      if (fromSquadRow && fromSquadRow.tenant_id !== leagueTenant) {
        throw new ApiError(409, ERROR_CODES.CROSS_TENANT_TRANSFER, 'Source squad is outside the league tenant.');
      }
      if (toSquad && toSquad.tenant_id !== leagueTenant) {
        throw new ApiError(409, ERROR_CODES.CROSS_TENANT_TRANSFER, 'Destination squad is outside the league tenant.');
      }

      // Check #4: player's current squad in this league equals from_squad_id
      if (t.from_squad_id && reg.squad_id !== t.from_squad_id) {
        throw new ApiError(409, ERROR_CODES.NOT_IN_SQUAD, 'Player is not currently in the stated squad.');
      }
      if (t.type === 'release' && t.from_squad_id && reg.squad_id !== t.from_squad_id) {
        throw new ApiError(409, ERROR_CODES.NOT_IN_SQUAD, 'Player is not currently in the stated squad.');
      }

      // Check #5: transfer/loan effective_date inside the window (inclusive)
      if (t.type === 'transfer' || t.type === 'loan') {
        const open = toDateStr(league.transfer_open);
        const close = toDateStr(league.transfer_close);
        if (open && close && !(t.effective_date >= open && t.effective_date <= close)) {
          throw new ApiError(409, ERROR_CODES.TRANSFER_WINDOW_CLOSED, 'Effective date is outside the transfer window.');
        }
      }

      // Check #6: player not currently on loan
      if (reg.on_loan) {
        throw new ApiError(409, ERROR_CODES.PLAYER_ON_LOAN, 'Player is currently on loan.');
      }

      // Check #7: transfer/loan destination squad count + 1 <= max_squad_size
      if ((t.type === 'transfer' || t.type === 'loan') && league.max_squad_size != null) {
        const destCount = await Repo.countSquadMembers(t.league_id, t.to_squad_id, client);
        if (destCount + 1 > league.max_squad_size) {
          throw new ApiError(409, ERROR_CODES.SQUAD_FULL, 'Destination squad is full.');
        }
      }

      // Check #8: after the move the from squad still meets required count for the player's position
      const requiredPositions = typeof league.required_positions === 'string'
        ? JSON.parse(league.required_positions) : (league.required_positions || {});
      if (fromSquadId && reg.position && requiredPositions[reg.position]) {
        const required = requiredPositions[reg.position];
        const currentCount = await Repo.squadPositionCount(t.league_id, fromSquadId, reg.position, client);
        if (currentCount - 1 < required) {
          throw new ApiError(409, ERROR_CODES.MIN_POSITION_VIOLATION, 'Move would break the minimum position requirement.');
        }
      }

      // In-progress match edge case: accepted but deferred
      const live = fromSquadId ? await Repo.findLiveMatchForSquad(t.league_id, fromSquadId, client) : null;
      const state = live ? 'deferred_until_match_end' : 'active';
      const blocking_match_id = live ? live.match_id : null;

      // ---- apply effects ----
      let registration = null;
      if (t.type === 'transfer') {
        await Repo.upsertRegistration({
          league_id: t.league_id, player_id: t.player_id, name: reg.name, position: reg.position,
          squad_id: t.to_squad_id, parent_squad_id: null, role: 'substitute',
          registration_type: 'transfer', start_date: t.effective_date, loan_end_date: null, on_loan: false,
        }, client);
        registration = {
          player_id: t.player_id, league_id: t.league_id, squad_id: t.to_squad_id, parent_squad_id: null,
          registration_type: 'transfer', start_date: t.effective_date, loan_end_date: null, role: 'substitute',
        };
      } else if (t.type === 'loan') {
        await Repo.upsertRegistration({
          league_id: t.league_id, player_id: t.player_id, name: reg.name, position: reg.position,
          squad_id: t.to_squad_id, parent_squad_id: fromSquadId, role: 'substitute',
          registration_type: 'loan', start_date: t.effective_date, loan_end_date: t.loan_end_date, on_loan: true,
        }, client);
        registration = {
          player_id: t.player_id, league_id: t.league_id, squad_id: t.to_squad_id, parent_squad_id: fromSquadId,
          registration_type: 'loan', start_date: t.effective_date, loan_end_date: t.loan_end_date, role: 'substitute',
        };
      } else { // release
        await Repo.upsertRegistration({
          league_id: t.league_id, player_id: t.player_id, name: reg.name, position: reg.position,
          squad_id: null, parent_squad_id: null, role: null,
          registration_type: 'release', start_date: t.effective_date, loan_end_date: null, on_loan: false,
        }, client);
        registration = null;
      }

      // ---- audit entry ----
      const auditNum = (await Repo.countAudit(t.league_id, client)) + 1;
      const audit_entry = {
        audit_id: padAudit(auditNum),
        action: t.type,
        player_id: t.player_id,
        league_id: t.league_id,
        from_squad_id: fromSquadId || null,
        to_squad_id: t.to_squad_id,
        effective_date: t.effective_date,
        state,
        who: t.requested_by || null,
        when: new Date().toISOString(),
        why: t.reason || null,
      };
      await Repo.insertAudit({
        audit_id: audit_entry.audit_id, league_id: t.league_id, player_id: t.player_id, action: t.type,
        from_squad_id: fromSquadId || null, to_squad_id: t.to_squad_id, effective_date: t.effective_date,
        state, who: audit_entry.who, why: audit_entry.why, entry: audit_entry,
      }, client);

      const response = { request_id: t.request_id, status: 'accepted', state, blocking_match_id, registration, audit_entry };

      await Repo.saveRequest(t.request_id, t.league_id, body, response, 201, client);

      return { statusCode: 201, data: response };
    });
  }

  // ---- GET /audit/v1/roster/history/{player_id} --------------------------
  static async getPlayerHistory(playerId, asOf) {
    return withTransaction(async (client) => {
      let reg = await Repo.findRegistrationByPlayer(playerId, client);
      if (!reg) throw new ApiError(404, ERROR_CODES.PLAYER_NOT_FOUND, `Player ${playerId} not found.`);

      const as_of = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : new Date().toISOString().slice(0, 10);
      const leagueId = reg.league_id;

      // Automatic loan return: the day after loan_end_date the player is back with the lender.
      if (reg.on_loan && reg.loan_end_date) {
        const end = toDateStr(reg.loan_end_date);
        const returnDate = dayAfter(end);
        if (as_of >= returnDate) {
          const already = await Repo.hasLoanReturn(leagueId, playerId, returnDate, client);
          if (!already) {
            const lender = reg.parent_squad_id;
            await Repo.upsertRegistration({
              league_id: leagueId, player_id: playerId, name: reg.name, position: reg.position,
              squad_id: lender, parent_squad_id: null, role: 'substitute',
              registration_type: 'loan_return', start_date: returnDate, loan_end_date: null, on_loan: false,
            }, client);
            const auditNum = (await Repo.countAudit(leagueId, client)) + 1;
            const entry = {
              audit_id: padAudit(auditNum), action: 'loan_return', player_id: playerId, league_id: leagueId,
              from_squad_id: reg.squad_id, to_squad_id: lender, effective_date: returnDate,
              state: 'active', who: 'system', when: new Date().toISOString(), why: null,
            };
            await Repo.insertAudit({
              audit_id: entry.audit_id, league_id: leagueId, player_id: playerId, action: 'loan_return',
              from_squad_id: reg.squad_id, to_squad_id: lender, effective_date: returnDate,
              state: 'active', who: 'system', why: null, entry,
            }, client);
            reg = await Repo.findRegistrationByPlayer(playerId, client);
          }
        }
      }

      // current_squad_id on `as_of`
      let current_squad_id;
      if (reg.registration_type === 'release' && !reg.squad_id) {
        current_squad_id = null;
      } else if (reg.on_loan && reg.start_date) {
        const start = toDateStr(reg.start_date);
        current_squad_id = as_of >= start ? reg.squad_id : reg.parent_squad_id;
      } else {
        current_squad_id = reg.squad_id;
      }

      const rows = await Repo.findAuditByPlayer(playerId, client);
      const history = rows.map((r) => (typeof r.entry === 'string' ? JSON.parse(r.entry) : r.entry));

      return {
        player_id: playerId,
        as_of,
        league_id: leagueId,
        current_squad_id,
        parent_squad_id: reg.parent_squad_id || null,
        history,
      };
    });
  }
}

module.exports = {
  RosterService,
};
