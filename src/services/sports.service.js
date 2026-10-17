'use strict';

/**
 * Sports Management Service (Section 5.6)
 */

const { SportRepository } = require('../repositories/sport.repository');
const { SportsValidator } = require('../validators/sports.validator');

class SportsService {
  static async registerSport(body) {
    const validSport = SportsValidator.validateSport(body);
    const created = await SportRepository.create(validSport);
    return {
      status: 'created',
      sport: created,
    };
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
