'use strict';

/**
 * Fixture Tournament Setup Validator (Section 5.7)
 */

const { ApiError } = require('../utils/api-error');

class FixturesValidator {
  static validateFixtureGeneration(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { league_id, format, teams } = body;

    if (!league_id || typeof league_id !== 'string') {
      throw ApiError.badRequest('league_id is required', { fields: ['league_id'] });
    }
    if (!format || !['round_robin', 'double_round_robin', 'swiss', 'single_elimination', 'double_elimination'].includes(format)) {
      throw ApiError.badRequest('format is invalid', { fields: ['format'] });
    }
    if (!Array.isArray(teams) || teams.length < 2) {
      throw ApiError.badRequest('teams must be an array of at least 2 teams', { fields: ['teams'] });
    }

    return {
      league_id,
      format,
      teams,
    };
  }
}

module.exports = {
  FixturesValidator,
};
