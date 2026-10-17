'use strict';

/**
 * Roster Controller (Section 5.11)
 */

const { RosterService } = require('../services/roster.service');

class RosterController {
  static async setup(req, res, next) {
    try {
      const result = await RosterService.setupRoster(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }

  static async transfer(req, res, next) {
    try {
      const result = await RosterService.transferPlayer(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const result = await RosterService.getPlayerHistory(req.params.player_id, req.query.as_of);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  RosterController,
};
