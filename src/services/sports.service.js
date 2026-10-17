'use strict';

/**
 * Sports Management Service (Section 5.6)
 * Creates a sport purely from JSON configuration. The new sport becomes
 * immediately usable by /events, /leagues, /standings and /fixtures.
 */

const { SportRepository } = require('../repositories/sport.repository');
const { SportsValidator } = require('../validators/sports.validator');
const { withTransaction } = require('../database/transactions');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class SportsService {
  static async registerSport(body) {
    const { sport_id, name, scoring_model, config } = SportsValidator.validateSport(body);

    return withTransaction(async (client) => {
      const existing = await SportRepository.findById(sport_id, client);
      if (existing) {
        throw new ApiError(409, ERROR_CODES.SPORT_EXISTS, `Sport ${sport_id} already exists.`);
      }

      await SportRepository.create({ sport_id, name, scoring_model, config }, client);

      return {
        statusCode: 201,
        data: {
          sport_id,
          status: 'created',
          config,
        },
      };
    });
  }

  static async getSportById(sportId) {
    return SportRepository.findById(sportId);
  }

  static async getAllSports() {
    return SportRepository.findAll();
  }
}

module.exports = {
  SportsService,
};
