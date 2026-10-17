'use strict';

/**
 * Strict Tenant Isolation Middleware (Section 3.3, 5.13)
 * Rejects cross-tenant access for non-super-admins with HTTP 403.
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

function tenantIsolation(getTenantId) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.'));
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const targetTenantId = typeof getTenantId === 'function' ? getTenantId(req) : req.params.tenant_id;
    if (targetTenantId && targetTenantId !== req.user.tenant_id) {
      return next(ApiError.forbidden('Cross-tenant access forbidden.'));
    }

    next();
  };
}

module.exports = {
  tenantIsolation,
  requireTenantIsolation: tenantIsolation,
};
