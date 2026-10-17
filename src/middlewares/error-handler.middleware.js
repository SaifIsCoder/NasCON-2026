'use strict';

/**
 * Centralized Error Handling Middleware (Section 5.2, 5.3, Appendix B)
 * Formats all application errors into the competition JSON error schema
 * without exposing stack traces, DB credentials, or secrets.
 */

const { ERROR_CODES } = require('../constants/error-codes.constants');
const { HTTP_STATUS } = require('../constants/http-status.constants');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = err.code || ERROR_CODES.INTERNAL_ERROR;
  const message = err.message || 'An internal server error occurred.';
  const details = err.details || {};

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = {
  errorHandler,
};
