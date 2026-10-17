'use strict';

/**
 * League Setup Validator (Section 5.8)
 */

const { ApiError } = require('../utils/api-error');

class LeaguesValidator {
  static validateLeague(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { league_id, tenant_id, sport_id, name, config } = body;

    if (!league_id || typeof league_id !== 'string') {
      throw ApiError.badRequest('league_id is required', { fields: ['league_id'] });
    }
    if (!tenant_id || typeof tenant_id !== 'string') {
      throw ApiError.badRequest('tenant_id is required', { fields: ['tenant_id'] });
    }
    if (!name || typeof name !== 'string') {
      throw ApiError.badRequest('name is required', { fields: ['name'] });
    }

    return {
      league_id,
      tenant_id,
      sport_id: sport_id || null,
      name,
      config: config || {},
    };
  }
}

module.exports = {
  LeaguesValidator,
};
