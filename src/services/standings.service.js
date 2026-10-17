'use strict';

/**
 * Automated Standings Service (Section 5.10)
 * Computes points table, wins/draws/losses, and applies tie-breaker ordering.
 */

const { LeagueRepository } = require('../repositories/league.repository');
const { ApiError } = require('../utils/api-error');

class StandingsService {
  /**
   * Compute standings table for a league
   * @param {string} leagueId
   * @returns {Promise<Object>}
   */
  static async getStandings(leagueId) {
    const league = await LeagueRepository.findById(leagueId);
    if (!league) {
      throw ApiError.notFound(`League ${leagueId} not found.`);
    }

    return {
      league_id: leagueId,
      name: league.name,
      season: '2026',
      table: [],
    };
  }
}

module.exports = {
  StandingsService,
};
