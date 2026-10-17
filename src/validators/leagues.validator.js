'use strict';

/**
 * League Setup Validator (Section 5.8)
 * Validates the standings-league registration body.
 */

const { ApiError } = require('../utils/api-error');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

class LeaguesValidator {
  static validateLeague(body) {
    if (!isObject(body)) {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const fields = [];
    const { league_id, sport_id, teams, fixtures, points, tie_break_order, qualification, lots_seed } = body;

    if (typeof league_id !== 'string' || league_id.length < 1) fields.push('league_id');
    if (typeof sport_id !== 'string' || sport_id.length < 1) fields.push('sport_id');

    if (!Array.isArray(teams) || teams.length < 2 || teams.length > 40) {
      fields.push('teams');
    } else if (new Set(teams).size !== teams.length || teams.some((t) => typeof t !== 'string')) {
      fields.push('teams');
    }

    const teamSet = Array.isArray(teams) ? new Set(teams) : new Set();
    if (!Array.isArray(fixtures)) {
      fields.push('fixtures');
    } else {
      for (const f of fixtures) {
        if (!isObject(f) || typeof f.match_id !== 'string' || typeof f.home !== 'string' || typeof f.away !== 'string') {
          fields.push('fixtures');
          break;
        }
        if (!teamSet.has(f.home) || !teamSet.has(f.away) || f.home === f.away) {
          fields.push('fixtures');
          break;
        }
      }
    }

    // points: optional ints, default 3/1/0
    let normPoints = { win: 3, draw: 1, loss: 0 };
    if (points !== undefined) {
      if (!isObject(points)) {
        fields.push('points');
      } else {
        const win = points.win === undefined ? 3 : points.win;
        const draw = points.draw === undefined ? 1 : points.draw;
        const loss = points.loss === undefined ? 0 : points.loss;
        if (!isInt(win) || !isInt(draw) || !isInt(loss)) {
          fields.push('points');
        } else {
          normPoints = { win, draw, loss };
        }
      }
    }

    // tie_break_order: optional; validated against the token list (default = sport's order, applied in service)
    const TIE = ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'];
    let normTie;
    if (tie_break_order !== undefined) {
      if (!Array.isArray(tie_break_order) || tie_break_order.some((t) => !TIE.includes(t)) || new Set(tie_break_order).size !== tie_break_order.length) {
        fields.push('tie_break_order');
      } else {
        normTie = tie_break_order.filter((t) => t !== 'draw_lots');
        normTie.push('draw_lots');
      }
    }

    // qualification.spots: required int 1..#teams
    const teamCount = Array.isArray(teams) ? teams.length : 0;
    if (!isObject(qualification) || !isInt(qualification.spots) || qualification.spots < 1 || qualification.spots > teamCount) {
      fields.push('qualification');
    }

    if (lots_seed !== undefined && !isInt(lots_seed)) fields.push('lots_seed');

    if (fields.length > 0) {
      throw ApiError.badRequest('One or more league fields are invalid.', { fields: [...new Set(fields)] });
    }

    return {
      league_id,
      sport_id,
      teams,
      fixtures: fixtures.map((f) => ({ match_id: f.match_id, home: f.home, away: f.away })),
      points: normPoints,
      tie_break_order: normTie, // undefined => use sport's order
      qualification: { spots: qualification.spots },
      lots_seed: lots_seed === undefined ? null : lots_seed,
    };
  }
}

module.exports = {
  LeaguesValidator,
};
