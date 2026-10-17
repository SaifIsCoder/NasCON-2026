'use strict';

/**
 * Events Controller (Section 5.9)
 */

const { EventsService } = require('../services/events.service');

class EventsController {
  static async appendEvent(req, res, next) {
    try {
      const result = await EventsService.appendEvent(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  EventsController,
};
