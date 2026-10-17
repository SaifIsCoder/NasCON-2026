'use strict';

/**
 * 404 Not Found Middleware
 * Returns consistent JSON response for unmatched routes.
 */

const { ApiError } = require('../utils/api-error');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl || req.url} not found.`));
}

module.exports = {
  notFoundHandler,
};
