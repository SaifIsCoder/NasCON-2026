'use strict';

/**
 * System Reset Input Validator (Section 5.5)
 */

const { ApiError } = require('../utils/api-error');

class ResetValidator {
  static validateReset(body = {}) {
    let seed = 42;
    if (body.seed !== undefined) {
      if (typeof body.seed !== 'number' || !Number.isInteger(body.seed) || body.seed < 0) {
        throw ApiError.badRequest('Invalid seed: must be a non-negative integer.', { fields: ['seed'] });
      }
      seed = body.seed;
    }

    const stockMap = {
      'var-jersey-001-M': 1,
      'var-jersey-001-L': 5,
    };

    if (body.stock !== undefined) {
      if (
        typeof body.stock !== 'object' ||
        body.stock === null ||
        Array.isArray(body.stock)
      ) {
        throw ApiError.badRequest('Invalid stock: must be a map of variant_id to non-negative integer.', {
          fields: ['stock'],
        });
      }

      for (const [varId, qty] of Object.entries(body.stock)) {
        if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 0) {
          throw ApiError.badRequest(`Invalid stock for variant ${varId}: must be a non-negative integer.`, {
            fields: ['stock'],
          });
        }
        stockMap[varId] = qty;
      }
    }

    return {
      seed,
      stockMap,
    };
  }
}

module.exports = {
  ResetValidator,
};
