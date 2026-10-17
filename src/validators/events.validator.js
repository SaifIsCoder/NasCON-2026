'use strict';

/**
 * Event Sourcing Input Validator (Section 5.9)
 */

const { ApiError } = require('../utils/api-error');

class EventsValidator {
  static validateAppendEvent(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { event_id, match_id, type, payload } = body;

    if (!event_id || typeof event_id !== 'string') {
      throw ApiError.badRequest('event_id is required', { fields: ['event_id'] });
    }
    if (!match_id || typeof match_id !== 'string') {
      throw ApiError.badRequest('match_id is required', { fields: ['match_id'] });
    }
    if (!type || typeof type !== 'string') {
      throw ApiError.badRequest('type is required', { fields: ['type'] });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw ApiError.badRequest('payload must be an object', { fields: ['payload'] });
    }

    return {
      event_id,
      match_id,
      type,
      payload,
    };
  }
}

module.exports = {
  EventsValidator,
};
