'use strict';

/**
 * Reset Controller (Section 5.5)
 */

const { ResetService } = require('../services/reset.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class ResetController {
  static async reset(req, res, next) {
    try {
      const result = await ResetService.performReset(req.body || {});
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  ResetController,
};
