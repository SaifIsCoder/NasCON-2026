'use strict';

/**
 * Score Projection Service (Section 5.9)
 * Rebuilds match scores and timelines from the immutable append-only event stream.
 */

const { FixtureRepository } = require('../repositories/fixture.repository');
const { EventRepository } = require('../repositories/event.repository');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class ScoringService {
  /**
   * Rebuild match timeline and score projection
   * @param {string} match_id
   * @returns {Promise<Object>}
   */
  static async getScore(match_id) {
    const match = await FixtureRepository.findMatchById(match_id);
    if (!match) {
      throw new ApiError(404, ERROR_CODES.MATCH_NOT_FOUND, `Match ${match_id} does not exist.`);
    }

    const events = await EventRepository.findByMatchId(match_id);

    return {
      match_id,
      sport_id: match.sport_id,
      league_id: match.league_id,
      status: match.status,
      events,
    };
  }
}

module.exports = {
  ScoringService,
};
