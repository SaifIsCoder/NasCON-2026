'use strict';

/**
 * Authentication Middleware (Section 5.13, 8.3)
 * Verifies Bearer JWT tokens and attaches authenticated user context to req.user.
 */

const { verifyToken } = require('../utils/jwt.util');
const { ApiError } = require('../utils/api-error');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return next(ApiError.unauthorized('Missing Authorization header.'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1].trim()) {
    return next(ApiError.unauthorized('Invalid Authorization header format. Expected Bearer <token>.'));
  }

  const token = parts[1].trim();

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return next(ApiError.unauthorized('Token is invalid, tampered, expired, or uses an unsupported algorithm.'));
  }
}

module.exports = {
  authenticate,
};
