'use strict';

/**
 * System Baseline Reset Service (Section 5.5)
 * Coordinates atomic wiping and re-seeding within a single database transaction.
 */

const { withTransaction } = require('../database/transactions');
const { wipeTransientData, seedBaselineData } = require('../database/seed-runner');
const { ResetValidator } = require('../validators/reset.validator');

class ResetService {
  /**
   * Reset application state and restore baseline data.
   *
   * @param {Object} [body={}]
   * @returns {Promise<Object>}
   */
  static async performReset(body = {}) {
    const { seed, stockMap } = ResetValidator.validateReset(body);

    await withTransaction(async (client) => {
      // 1. Wipe transient data in dependency order (preserves migrations)
      await wipeTransientData(client);

      // 2. Seed baseline data fixtures
      await seedBaselineData(client, { seed, stockMap });
    });

    return {
      status: 'reset_complete',
      seed: seed,
      sports: ['football', 'basketball', 'cricket', 'esports'],
      tenants: ['tenant-alpha', 'tenant-beta'],
      stock: {
        'var-jersey-001-M': stockMap['var-jersey-001-M'],
        'var-jersey-001-L': stockMap['var-jersey-001-L'],
      },
    };
  }
}

module.exports = {
  ResetService,
};
