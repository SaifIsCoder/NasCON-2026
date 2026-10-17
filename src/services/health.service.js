'use strict';

/**
 * System Health Service (Section 5.4)
 * Verifies PostgreSQL connectivity and presence of seeded baseline entities.
 */

const db = require('../config/database');
const { TenantRepository } = require('../repositories/tenant.repository');
const { SportRepository } = require('../repositories/sport.repository');
const { InventoryRepository } = require('../repositories/inventory.repository');
const { UserRepository } = require('../repositories/user.repository');
const { LeagueRepository } = require('../repositories/league.repository');
const { RosterRepository } = require('../repositories/roster.repository');

class HealthService {
  /**
   * Check database connectivity and baseline data completeness
   * @returns {Promise<{ healthy: boolean, reason?: string }>}
   */
  static async checkHealth() {
    try {
      // 1. Verify DB connectivity
      await db.query('SELECT 1');

      // 2. Verify Baseline Tenants (tenant-alpha, tenant-beta)
      const tenants = await TenantRepository.findBaselineTenants();
      if (tenants.length < 2) {
        return { healthy: false, reason: 'Baseline tenants not seeded' };
      }

      // 3. Verify Baseline Sports (4 baseline sports)
      const sports = await SportRepository.findBaselineSports();
      if (sports.length < 4) {
        return { healthy: false, reason: 'Baseline sports not seeded' };
      }

      // 4. Verify Baseline Products & Variants
      const products = await InventoryRepository.findBaselineProducts();
      if (products.length < 1) {
        return { healthy: false, reason: 'Baseline product not seeded' };
      }

      const variants = await InventoryRepository.findBaselineVariants();
      if (variants.length < 2) {
        return { healthy: false, reason: 'Baseline product variants not seeded' };
      }

      // 5. Verify Baseline Demo Users (5 accounts)
      const users = await UserRepository.findDemoUsers();
      if (users.length < 5) {
        return { healthy: false, reason: 'Baseline demo accounts not seeded' };
      }

      // 6. Verify Baseline Leagues, Clubs, and Players
      const leagues = await LeagueRepository.findBaselineLeagues();
      if (leagues.length < 3) {
        return { healthy: false, reason: 'Baseline leagues not seeded' };
      }

      const clubs = await RosterRepository.findBaselineClubs();
      if (clubs.length < 3) {
        return { healthy: false, reason: 'Baseline clubs not seeded' };
      }

      const players = await RosterRepository.findBaselinePlayers();
      if (players.length < 3) {
        return { healthy: false, reason: 'Baseline players not seeded' };
      }

      return { healthy: true };
    } catch (err) {
      return { healthy: false, reason: 'Database connectivity error' };
    }
  }
}

module.exports = {
  HealthService,
};
