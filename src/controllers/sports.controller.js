'use strict';

/**
 * Sports Controller (Section 5.6)
 */

const { SportsService } = require('../services/sports.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class SportsController {
  static async registerSport(req, res, next) {
    try {
      const result = await SportsService.registerSport(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }

  static async getAllSports(req, res, next) {
    try {
      const sports = await SportsService.getAllSports();
      res.status(HTTP_STATUS.OK).json({ sports });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  SportsController,
};
