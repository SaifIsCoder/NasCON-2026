'use strict';

/**
 * Health Controller (Section 5.4)
 */

const { HealthService } = require('../services/health.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class HealthController {
  static async getHealth(req, res) {
    try {
      const health = await HealthService.checkHealth();
      if (!health.healthy) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          status: 'error',
          error: {
            code: ERROR_CODES.SERVICE_UNAVAILABLE,
            message: 'Database is unreachable or baseline data is not seeded.',
            details: {},
          },
        });
      }
      return res.status(HTTP_STATUS.OK).json({ status: 'ok' });
    } catch (err) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: 'error',
        error: {
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'Database is unreachable or baseline data is not seeded.',
          details: {},
        },
      });
    }
  }
}

module.exports = {
  HealthController,
};
