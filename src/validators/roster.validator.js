'use strict';

/**
 * Roster Setup & Transfer Validator (Section 5.11)
 */

const { ApiError } = require('../utils/api-error');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
const TRANSFER_TYPES = ['transfer', 'loan', 'release'];
const ROLES = ['captain', 'vice_captain', 'starter', 'substitute'];

class RosterValidator {
  static validateSetup(body) {
    if (!isObject(body)) throw ApiError.badRequest('Request body must be a JSON object.');
    const fields = [];
    const { league, squads, players, matches_in_progress } = body;

    if (!isObject(league) || typeof league.league_id !== 'string' || league.league_id.length < 1) {
      fields.push('league');
    }
    if (!Array.isArray(squads)) fields.push('squads');
    else {
      for (const s of squads) {
        if (!isObject(s) || typeof s.squad_id !== 'string') { fields.push('squads'); break; }
      }
    }
    if (!Array.isArray(players)) fields.push('players');
    else {
      for (const p of players) {
        if (!isObject(p) || typeof p.player_id !== 'string') { fields.push('players'); break; }
        if (p.role !== undefined && !ROLES.includes(p.role)) { fields.push('players'); break; }
      }
    }
    if (matches_in_progress !== undefined && !Array.isArray(matches_in_progress)) {
      fields.push('matches_in_progress');
    }

    if (fields.length > 0) {
      throw ApiError.badRequest('One or more roster setup fields are invalid.', { fields: [...new Set(fields)] });
    }

    return {
      league,
      squads,
      players,
      matches_in_progress: matches_in_progress || [],
    };
  }

  // Check #1 of the transfer rule order: schema, dates, loan_end_date > effective_date,
  // to_squad_id present unless release.
  static validateTransfer(body) {
    if (!isObject(body)) throw ApiError.badRequest('Request body must be a JSON object.');
    const fields = [];
    const {
      request_id, league_id, player_id, type,
      from_squad_id, to_squad_id, effective_date, loan_end_date,
    } = body;

    if (typeof request_id !== 'string' || request_id.length < 1) fields.push('request_id');
    if (typeof league_id !== 'string' || league_id.length < 1) fields.push('league_id');
    if (typeof player_id !== 'string' || player_id.length < 1) fields.push('player_id');
    if (!TRANSFER_TYPES.includes(type)) fields.push('type');
    if (!isValidDate(effective_date)) fields.push('effective_date');

    if (type === 'transfer' || type === 'loan') {
      if (typeof to_squad_id !== 'string' || to_squad_id.length < 1) fields.push('to_squad_id');
      if (typeof from_squad_id !== 'string' || from_squad_id.length < 1) fields.push('from_squad_id');
    }
    if (type === 'loan') {
      if (!isValidDate(loan_end_date)) {
        fields.push('loan_end_date');
      } else if (isValidDate(effective_date) && !(loan_end_date > effective_date)) {
        fields.push('loan_end_date');
      }
    }

    if (fields.length > 0) {
      throw ApiError.badRequest('One or more transfer fields are invalid.', { fields: [...new Set(fields)] });
    }

    return {
      request_id,
      league_id,
      player_id,
      type,
      from_squad_id: from_squad_id || null,
      to_squad_id: type === 'release' ? null : to_squad_id,
      effective_date,
      loan_end_date: type === 'loan' ? loan_end_date : null,
      reason: typeof body.reason === 'string' ? body.reason : null,
      requested_by: typeof body.requested_by === 'string' ? body.requested_by : null,
    };
  }
}

module.exports = {
  RosterValidator,
};
