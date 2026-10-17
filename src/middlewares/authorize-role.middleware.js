'use strict';

/**
 * Role-Based Access Control Authorization Middleware
 * Enforces role restrictions. Platform Super-Admin always bypasses.
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (req.user.role === ROLES.SUPER_ADMIN || roles.includes(req.user.role)) {
      return next();
    }

    return next(ApiError.forbidden('Role not authorized for this operation.'));
  };
}

module.exports = {
  authorizeRole,
  requireRole: authorizeRole,
};
