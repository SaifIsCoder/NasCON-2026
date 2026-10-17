'use strict';

/**
 * Backward-Compatibility Bridge for System Module
 * Re-exports from src/services/ and src/database/
 */

const { HealthService } = require('../../services/health.service');
const { ResetService } = require('../../services/reset.service');
const { BASELINE_SPORTS, DEMO_USERS } = require('../../database/seed-runner');

module.exports = {
  checkHealth: HealthService.checkHealth.bind(HealthService),
  performReset: ResetService.performReset.bind(ResetService),
  BASELINE_SPORTS,
  DEMO_USERS,
};
