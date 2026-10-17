'use strict';

/**
 * Standardized API Error Class
 * Formats errors according to Section 5.2/5.3 and Appendix B error body schema.
 */

const { HTTP_STATUS } = require('../constants/http-status.constants');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class ApiError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.code = code || ERROR_CODES.INTERNAL_ERROR;
    this.details = details || {};
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Validation error occurred.', details = {}, code = ERROR_CODES.VALIDATION_ERROR) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, code, message, details);
  }

  static unauthorized(message = 'Authentication required.', details = {}, code = ERROR_CODES.UNAUTHENTICATED) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, code, message, details);
  }

  static forbidden(message = 'Access denied.', details = {}, code = ERROR_CODES.FORBIDDEN) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, code, message, details);
  }

  static notFound(message = 'Resource not found.', details = {}, code = ERROR_CODES.NOT_FOUND) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, code, message, details);
  }

  static conflict(message = 'Resource conflict.', details = {}, code = ERROR_CODES.CONFLICT) {
    return new ApiError(HTTP_STATUS.CONFLICT, code, message, details);
  }

  static payloadTooLarge(message = 'Request body exceeds 1 MB limit.', details = {}) {
    return new ApiError(HTTP_STATUS.PAYLOAD_TOO_LARGE, ERROR_CODES.PAYLOAD_TOO_LARGE, message, details);
  }

  static serviceUnavailable(message = 'Service unavailable.', details = {}) {
    return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE, message, details);
  }

  static internal(message = 'An internal server error occurred.', details = {}) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, message, details);
  }
}

module.exports = {
  ApiError,
};
