'use strict';

/**
 * Fixture Tournament Setup Validator (Section 5.7)
 * The /fixtures endpoint is pure computation: { format, teams, params }.
 */

const { ApiError } = require('../utils/api-error');

const FORMATS = ['round_robin', 'swiss', 'single_elim', 'double_elim'];

const TEAM_LIMITS = Object.freeze({
  round_robin: { min: 2, max: 40 },
  swiss: { min: 2, max: 64 },
  single_elim: { min: 2, max: 128 },
  double_elim: { min: 3, max: 128 },
});

class FixturesValidator {
  static validateFixtureGeneration(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.badRequest('Request body must be a JSON object.', { fields: ['body'] });
    }

    const { format, teams } = body;
    const params = body.params && typeof body.params === 'object' && !Array.isArray(body.params) ? body.params : {};

    if (!format || typeof format !== 'string' || !FORMATS.includes(format)) {
      throw ApiError.badRequest(`format must be one of ${FORMATS.join(', ')}`, { fields: ['format'] });
    }

    if (!Array.isArray(teams)) {
      throw ApiError.badRequest('teams must be an array of team-id strings', { fields: ['teams'] });
    }
    if (!teams.every((t) => typeof t === 'string' && t.length > 0)) {
      throw ApiError.badRequest('teams must contain only non-empty strings', { fields: ['teams'] });
    }
    if (new Set(teams).size !== teams.length) {
      throw ApiError.badRequest('teams must be unique', { fields: ['teams'] });
    }

    const limits = TEAM_LIMITS[format];
    if (teams.length < limits.min || teams.length > limits.max) {
      throw ApiError.badRequest(
        `${format} requires between ${limits.min} and ${limits.max} teams`,
        { fields: ['teams'] }
      );
    }

    return { format, teams, params };
  }
}

module.exports = {
  FixturesValidator,
  FORMATS,
  TEAM_LIMITS,
};
