'use strict';

/**
 * Backward-Compatibility Bridge for Events Module
 * Re-exports from src/services/events.service and src/services/scoring.service
 */

const { EventsService } = require('../../services/events.service');
const { ScoringService } = require('../../services/scoring.service');
const { ApiError } = require('../../utils/api-error');

class EventError extends ApiError {
  constructor(statusCode, code, message, details = {}) {
    super(statusCode, code, message, details);
  }
}

module.exports = {
  appendEvent: EventsService.appendEvent.bind(EventsService),
  getScore: ScoringService.getScore.bind(ScoringService),
  EventError,
};
