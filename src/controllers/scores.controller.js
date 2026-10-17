'use strict';

/**
 * Score Projection Controller (Section 5.9)
 */

const { ScoringService } = require('../services/scoring.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class ScoresController {
  static async getScore(req, res, next) {
    try {
      const result = await ScoringService.getScore(req.params.match_id);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  ScoresController,
};
