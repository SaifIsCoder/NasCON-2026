'use strict';

/**
 * Roster Controller (Section 5.11)
 */

const { RosterService } = require('../services/roster.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class RosterController {
  static async setup(req, res, next) {
    try {
      const result = await RosterService.setupRoster(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async transfer(req, res, next) {
    try {
      const result = await RosterService.transferPlayer(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const result = await RosterService.getPlayerHistory(req.params.player_id);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  RosterController,
};
