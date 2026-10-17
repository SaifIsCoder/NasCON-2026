'use strict';

/**
 * League Setup Service (Section 5.8)
 * Registers teams, the full fixture list, and standings configuration.
 * Each fixture automatically becomes a match stream (status "upcoming")
 * that is subsequently fed through /events and read by /standings.
 */

const { LeagueRepository } = require('../repositories/league.repository');
const { SportRepository } = require('../repositories/sport.repository');
const { FixtureRepository } = require('../repositories/fixture.repository');
const { LeaguesValidator } = require('../validators/leagues.validator');
const { withTransaction } = require('../database/transactions');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

const DEFAULT_TENANT = 'tenant-alpha';

class LeaguesService {
  static async setupLeague(body) {
    const parsed = LeaguesValidator.validateLeague(body);

    return withTransaction(async (client) => {
      // League id already used -> 409 LEAGUE_EXISTS
      const existingLeague = await LeagueRepository.findById(parsed.league_id, client);
      if (existingLeague) {
        throw new ApiError(409, ERROR_CODES.LEAGUE_EXISTS, `League ${parsed.league_id} already exists.`);
      }

      // Sport must exist -> 404 SPORT_NOT_FOUND
      const sport = await SportRepository.findById(parsed.sport_id, client);
      if (!sport) {
        throw new ApiError(404, ERROR_CODES.SPORT_NOT_FOUND, `Sport ${parsed.sport_id} does not exist.`);
      }

      // Any fixture match_id already used -> 409 MATCH_EXISTS
      for (const f of parsed.fixtures) {
        const m = await FixtureRepository.findMatchByIdForUpdate(f.match_id, client);
        if (m) {
          throw new ApiError(409, ERROR_CODES.MATCH_EXISTS, `Match ${f.match_id} already exists.`);
        }
      }

      // Resolve defaults
      const sportConfig = typeof sport.config === 'string' ? JSON.parse(sport.config) : sport.config;
      const tieBreak = parsed.tie_break_order || sportConfig.tie_break_order || [
        'h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots',
      ];

      let lotsSeed = parsed.lots_seed;
      if (lotsSeed === null) {
        const seedRes = await client.query('SELECT seed FROM audit_reset_state WHERE id = 1');
        lotsSeed = seedRes.rows[0] ? seedRes.rows[0].seed : 42;
      }

      const config = {
        sport_id: parsed.sport_id,
        teams: parsed.teams,
        fixtures: parsed.fixtures,
        points: parsed.points,
        tie_break_order: tieBreak,
        qualification: parsed.qualification,
        lots_seed: lotsSeed,
      };

      await LeagueRepository.create(
        {
          league_id: parsed.league_id,
          tenant_id: DEFAULT_TENANT,
          sport_id: parsed.sport_id,
          name: parsed.league_id,
          config,
        },
        client
      );

      // Create a match stream for each fixture (status upcoming)
      for (const f of parsed.fixtures) {
        await FixtureRepository.createMatch(
          {
            match_id: f.match_id,
            sport_id: parsed.sport_id,
            league_id: parsed.league_id,
            home_team_id: f.home,
            away_team_id: f.away,
            status: 'upcoming',
          },
          client
        );
      }

      return {
        statusCode: 201,
        data: {
          league_id: parsed.league_id,
          status: 'created',
          team_count: parsed.teams.length,
          fixture_count: parsed.fixtures.length,
        },
      };
    });
  }

  static async getLeagueById(leagueId) {
    return LeagueRepository.findById(leagueId);
  }
}

module.exports = {
  LeaguesService,
};
