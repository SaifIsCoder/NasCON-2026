'use strict';

/**
 * RBAC Service (Section 5.13, 8.3)
 * Coordinates authorization matrix generation and Section 5.13 probe evaluations.
 */

const { UserRepository } = require('../repositories/user.repository');
const { TokenService } = require('./token.service');
const { RbacPolicy } = require('../policies/rbac.policy');

class RbacService {
  /**
   * Generates tokens and scenario context for POST /audit/v1/rbac-matrix
   * @returns {Promise<Object>}
   */
  static async getRbacMatrix() {
    const rows = await UserRepository.findDemoUsers();
    const usersByRole = {};
    for (const row of rows) {
      usersByRole[row.role] = row;
    }

    const superAdmin = usersByRole['super_admin'] || {
      user_id: 'usr-admin-001',
      email: 'admin@nascon.test',
      role: 'super_admin',
      tenant_id: null,
    };
    const organizer = usersByRole['league_organizer'] || {
      user_id: 'usr-org-001',
      email: 'organizer@nascon.test',
      role: 'league_organizer',
      tenant_id: 'tenant-alpha',
      league_id: 'league-alpha-1',
    };
    const clubManager = usersByRole['club_manager'] || {
      user_id: 'usr-mgr-001',
      email: 'manager@nascon.test',
      role: 'club_manager',
      tenant_id: 'tenant-alpha',
      club_id: 'club-alpha-1',
    };
    const player = usersByRole['player'] || {
      user_id: 'usr-player-001',
      email: 'player@nascon.test',
      role: 'player',
      tenant_id: 'tenant-alpha',
      club_id: 'club-alpha-1',
      player_id: 'player-alpha-1',
    };
    const viewer = usersByRole['viewer'] || {
      user_id: 'usr-viewer-001',
      email: 'viewer@nascon.test',
      role: 'viewer',
      tenant_id: 'tenant-alpha',
    };

    return {
      tokens: {
        super_admin: TokenService.createToken(superAdmin, '24h'),
        league_organizer: TokenService.createToken(organizer, '24h'),
        club_manager: TokenService.createToken(clubManager, '24h'),
        player: TokenService.createToken(player, '24h'),
        viewer: TokenService.createToken(viewer, '24h'),
      },
      context: {
        tenant_id: 'tenant-alpha',
        foreign_tenant_id: 'tenant-beta',
        own_league_id: 'league-alpha-1',
        other_league_id: 'league-alpha-2',
        foreign_league_id: 'league-beta-1',
        own_club_id: 'club-alpha-1',
        other_club_id: 'club-alpha-2',
        foreign_club_id: 'club-beta-1',
        own_player_id: 'player-alpha-1',
        other_player_id: 'player-alpha-2',
        foreign_player_id: 'player-beta-1',
      },
    };
  }

  /**
   * Evaluate Section 5.13 Probe authorization
   * @param {string} probeId
   * @param {Object} user
   * @param {Object} [params]
   * @returns {Promise<boolean>}
   */
  static async authorizeProbe(probeId, user, params = {}) {
    return RbacPolicy.authorizeProbe(probeId, user, params);
  }
}

module.exports = {
  RbacService,
};
