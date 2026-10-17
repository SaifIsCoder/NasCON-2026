'use strict';

/**
 * Standings Controller (Section 5.10)
 */

const { StandingsService } = require('../services/standings.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class StandingsController {
  static async getStandings(req, res, next) {
    try {
      const result = await StandingsService.getStandings(req.params.league_id);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  StandingsController,
};
