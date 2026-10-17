'use strict';

/**
 * Fixtures Controller (Section 5.7)
 */

const { FixturesService } = require('../services/fixtures.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class FixturesController {
  static async generateFixtures(req, res, next) {
    try {
      const result = await FixturesService.generateFixtures(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  FixturesController,
};
