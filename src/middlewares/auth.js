'use strict';

/**
 * Backward-Compatibility Re-export for Auth Middleware
 * Bridges legacy imports to src/middlewares/
 */

const { authenticate } = require('./authenticate.middleware');
const { requireRole } = require('./authorize-role.middleware');
const { requireTenantIsolation } = require('./tenant-isolation.middleware');

module.exports = {
  authenticate,
  requireRole,
  requireTenantIsolation,
};
