'use strict';

/**
 * Backward-Compatibility Re-export for Auth Middleware
 * Bridges legacy imports to src/middlewares/
 */

const { authenticate } = require('../middlewares/authenticate.middleware');
const { requireRole } = require('../middlewares/authorize-role.middleware');
const { requireTenantIsolation } = require('../middlewares/tenant-isolation.middleware');

module.exports = {
  authenticate,
  requireRole,
  requireTenantIsolation,
};
