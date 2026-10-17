'use strict';

/**
 * Score Projection Service (Section 5.9)
 * Rebuilds match scores, per-team stats, outcome and the full event timeline
 * from the immutable append-only event stream on every read.
 */

const { FixtureRepository } = require('../repositories/fixture.repository');
const { EventRepository } = require('../repositories/event.repository');
const { SportRepository } = require('../repositories/sport.repository');
const { projectMatch } = require('./match-projection');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class ScoringService {
  static async getScore(match_id) {
    const match = await FixtureRepository.findMatchById(match_id);
    if (!match) {
      throw new ApiError(404, ERROR_CODES.MATCH_NOT_FOUND, `Match ${match_id} does not exist.`);
    }

    const events = await EventRepository.findByMatchId(match_id);
    const sport = await SportRepository.findById(match.sport_id);

    const proj = projectMatch(match, events, sport);

    return {
      match_id,
      sport_id: proj.sport_id,
      league_id: proj.league_id,
      status: proj.status,
      outcome: proj.outcome,
      winner_team_id: proj.winner_team_id,
      tiebreak_winner_team_id: proj.tiebreak_winner_team_id,
      home: proj.home,
      away: proj.away,
      version: events.length,
      events: events.map((e) => ({
        sequence: e.sequence,
        event_id: e.event_id,
        type: e.type,
        payload: e.payload,
        signature: e.signature,
        compensated: e.compensated,
        compensated_by: e.compensated_by,
      })),
    };
  }
}

module.exports = {
  ScoringService,
};
