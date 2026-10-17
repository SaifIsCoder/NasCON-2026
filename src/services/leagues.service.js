'use strict';

/**
 * League Setup Service (Section 5.8)
 */

const { LeagueRepository } = require('../repositories/league.repository');
const { LeaguesValidator } = require('../validators/leagues.validator');

class LeaguesService {
  static async setupLeague(body) {
    const validLeague = LeaguesValidator.validateLeague(body);
    const created = await LeagueRepository.create(validLeague);
    return {
      status: 'created',
      league: created,
    };
  }

  static async getLeagueById(leagueId) {
    return LeagueRepository.findById(leagueId);
  }
}

module.exports = {
  LeaguesService,
};
