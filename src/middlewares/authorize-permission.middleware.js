'use strict';

/**
 * Permission-Based Authorization Middleware
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

function authorizePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Role-specific permission check
    if (req.user.role === ROLES.VIEWER && permission && permission.includes('write')) {
      return next(ApiError.forbidden('Viewers cannot perform write operations.'));
    }

    next();
  };
}

module.exports = {
  authorizePermission,
};
