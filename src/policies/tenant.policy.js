'use strict';

/**
 * Tenant Isolation Policy (Section 3.3, 5.13)
 * Guarantees strict multi-tenant data boundaries.
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

class TenantPolicy {
  /**
   * Verify if authenticated user has access to target tenant.
   * @param {Object} user
   * @param {string} targetTenantId
   * @returns {boolean}
   */
  static canAccessTenant(user, targetTenantId) {
    if (!user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    if (user.role === ROLES.SUPER_ADMIN) {
      return true;
    }

    if (!targetTenantId) {
      return true;
    }

    if (user.tenant_id !== targetTenantId) {
      throw ApiError.forbidden('Cross-tenant access forbidden.');
    }

    return true;
  }
}

module.exports = {
  TenantPolicy,
};
