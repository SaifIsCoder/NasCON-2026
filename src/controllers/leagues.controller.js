'use strict';

/**
 * Leagues Controller (Section 5.8)
 */

const { LeaguesService } = require('../services/leagues.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class LeaguesController {
  static async setupLeague(req, res, next) {
    try {
      const result = await LeaguesService.setupLeague(req.body);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  LeaguesController,
};
