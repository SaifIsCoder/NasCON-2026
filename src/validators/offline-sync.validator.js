'use strict';

/**
 * Offline Sync Batch Validator (Section 5.14)
 */

const { ApiError } = require('../utils/api-error');

class OfflineSyncValidator {
  static validateSyncBatch(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }
    const { device_id, operations } = body;
    if (!device_id || typeof device_id !== 'string') {
      throw ApiError.badRequest('device_id is required', { fields: ['device_id'] });
    }
    if (!Array.isArray(operations)) {
      throw ApiError.badRequest('operations must be an array', { fields: ['operations'] });
    }
    return { device_id, operations };
  }
}

module.exports = {
  OfflineSyncValidator,
};
