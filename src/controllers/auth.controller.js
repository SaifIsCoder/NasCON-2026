'use strict';

/**
 * Authentication Controller (Section 8.3)
 */

const { AuthService } = require('../services/auth.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class AuthController {
  static async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body || {});
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  AuthController,
};
