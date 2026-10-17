'use strict';

/**
 * Request ID Middleware
 * Attaches a unique request ID to req and response headers.
 */

const crypto = require('crypto');

function requestId(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

module.exports = {
  requestId,
};
