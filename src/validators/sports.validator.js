'use strict';

/**
 * Sport Setup Validator (Section 5.6)
 */

const { ApiError } = require('../utils/api-error');

class SportsValidator {
  static validateSport(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { sport_id, name, scoring_model, config } = body;

    if (!sport_id || typeof sport_id !== 'string') {
      throw ApiError.badRequest('sport_id is required', { fields: ['sport_id'] });
    }
    if (!name || typeof name !== 'string') {
      throw ApiError.badRequest('name is required', { fields: ['name'] });
    }
    if (!scoring_model || !['event', 'innings', 'round'].includes(scoring_model)) {
      throw ApiError.badRequest('scoring_model must be event, innings, or round', { fields: ['scoring_model'] });
    }

    return {
      sport_id,
      name,
      scoring_model,
      config: config || {},
    };
  }
}

module.exports = {
  SportsValidator,
};
