'use strict';

/**
 * Fixture & Tournament Scheduling Service (Section 5.7)
 * Implements tournament bracket generation for Round-Robin, Swiss, and Elimination formats.
 */

const { FixturesValidator } = require('../validators/fixtures.validator');

class FixturesService {
  /**
   * Generates fixtures based on tournament format
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  static async generateFixtures(body) {
    const { league_id, format, teams } = FixturesValidator.validateFixtureGeneration(body);

    const matches = [];
    const teamList = [...teams];
    if (teamList.length % 2 !== 0) {
      teamList.push('BYE');
    }

    const numTeams = teamList.length;
    const numRounds = numTeams - 1;
    const half = numTeams / 2;

    if (format === 'round_robin' || format === 'double_round_robin') {
      const currentTeams = [...teamList];
      for (let round = 1; round <= numRounds; round++) {
        for (let i = 0; i < half; i++) {
          const home = currentTeams[i];
          const away = currentTeams[numTeams - 1 - i];
          if (home !== 'BYE' && away !== 'BYE') {
            matches.push({
              match_id: `match_${league_id}_r${round}_${i + 1}`,
              league_id,
              round,
              home_team_id: home,
              away_team_id: away,
              status: 'upcoming',
            });
          }
        }
        // Rotate teams fixing index 0
        const fixed = currentTeams[0];
        const last = currentTeams[numTeams - 1];
        const rest = currentTeams.slice(1, numTeams - 1);
        currentTeams.splice(0, numTeams, fixed, last, ...rest);
      }

      if (format === 'double_round_robin') {
        const firstLegCount = matches.length;
        for (let i = 0; i < firstLegCount; i++) {
          const m = matches[i];
          matches.push({
            match_id: `match_${league_id}_r${m.round + numRounds}_${i + 1}`,
            league_id,
            round: m.round + numRounds,
            home_team_id: m.away_team_id,
            away_team_id: m.home_team_id,
            status: 'upcoming',
          });
        }
      }
    } else {
      // Single elimination / Swiss format stub
      for (let i = 0; i < teams.length; i += 2) {
        if (teams[i + 1]) {
          matches.push({
            match_id: `match_${league_id}_r1_${Math.floor(i / 2) + 1}`,
            league_id,
            round: 1,
            home_team_id: teams[i],
            away_team_id: teams[i + 1],
            status: 'upcoming',
          });
        }
      }
    }

    return {
      league_id,
      format,
      total_matches: matches.length,
      fixtures: matches,
    };
  }
}

module.exports = {
  FixturesService,
};
