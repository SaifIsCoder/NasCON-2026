'use strict';

/**
 * Leagues Controller (Section 5.8)
 */

const { LeaguesService } = require('../services/leagues.service');

class LeaguesController {
  static async setupLeague(req, res, next) {
    try {
      const result = await LeaguesService.setupLeague(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  LeaguesController,
};
