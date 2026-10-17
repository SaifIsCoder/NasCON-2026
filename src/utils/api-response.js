'use strict';

/**
 * Standardized API Response Helper
 */

const { HTTP_STATUS } = require('../constants/http-status.constants');

class ApiResponse {
  static success(res, data, statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json(data);
  }

  static error(res, code, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = {}) {
    return res.status(statusCode).json({
      error: {
        code,
        message,
        details,
      },
    });
  }
}

module.exports = {
  ApiResponse,
};
