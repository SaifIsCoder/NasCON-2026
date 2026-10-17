'use strict';

/**
 * Offline Sync Batch Validator (Section 5.14)
 * Only a malformed envelope is a 400; per-action conflicts are reported
 * per action by the service.
 */

const { ApiError } = require('../utils/api-error');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

class OfflineSyncValidator {
  static validateSyncBatch(body) {
    if (!isObject(body)) {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }
    const { device_id, actions } = body;
    if (typeof device_id !== 'string' || device_id.length < 1) {
      throw ApiError.badRequest('device_id is required', { fields: ['device_id'] });
    }
    if (!Array.isArray(actions) || actions.length < 1 || actions.length > 100) {
      throw ApiError.badRequest('actions must be an array of 1 to 100 items', { fields: ['actions'] });
    }
    return { device_id, actions };
  }
}

module.exports = {
  OfflineSyncValidator,
};
