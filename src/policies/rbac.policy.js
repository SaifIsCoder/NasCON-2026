'use strict';

/**
 * RBAC Policy Engine (Section 5.13 & Section 8.3)
 * Evaluates authorization for operations and Section 5.13 Probes P1–P7.
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');
const { RosterRepository } = require('../repositories/roster.repository');

class RbacPolicy {
  /**
   * Evaluates Section 5.13 Probes (P1 to P7).
   * Throws 403 ApiError if authorization fails.
   *
   * @param {string} probeId - 'P1'..'P7'
   * @param {Object} user - Authenticated user context from JWT
   * @param {Object} [params] - Request parameters
   * @returns {Promise<boolean>}
   */
  static async authorizeProbe(probeId, user, params = {}) {
    if (!user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    // Platform Super-Admin has global bypass across all probes
    if (user.role === ROLES.SUPER_ADMIN) {
      return true;
    }

    switch (probeId) {
      case 'P1': {
        // POST /audit/v1/rbac/tenants: super_admin only
        throw ApiError.forbidden('Only super_admin may manage tenants.');
      }

      case 'P2': {
        // POST /audit/v1/rbac/leagues/:league_id/fixtures
        // Allowed only for league_organizer on own league
        const leagueId = params.league_id;
        if (user.role === ROLES.LEAGUE_ORGANIZER && user.league_id && leagueId === user.league_id) {
          return true;
        }
        throw ApiError.forbidden('League organizer can only manage fixtures for own league.');
      }

      case 'P3':
      case 'P4': {
        // P3: POST /audit/v1/rbac/clubs/:club_id/roster
        // P4: POST /audit/v1/rbac/clubs/:club_id/products
        // Allowed only for club_manager on own club
        const clubId = params.club_id;
        if (user.role === ROLES.CLUB_MANAGER && user.club_id && clubId === user.club_id) {
          return true;
        }
        throw ApiError.forbidden('Club manager can only manage resources for own club.');
      }

      case 'P5': {
        // PATCH /audit/v1/rbac/players/:player_id
        // Allowed for:
        // - player on self only
        // - club_manager on players in own club & tenant
        const playerId = params.player_id;

        if (user.role === ROLES.PLAYER) {
          if (user.player_id && playerId === user.player_id) {
            return true;
          }
          throw ApiError.forbidden('Players may only update their own profile.');
        }

        if (user.role === ROLES.CLUB_MANAGER) {
          const player = await RosterRepository.findPlayerById(playerId);
          if (player && player.tenant_id === user.tenant_id && player.club_id === user.club_id) {
            return true;
          }
          throw ApiError.forbidden('Club manager can only update players in own club.');
        }

        throw ApiError.forbidden('Operation not permitted for role.');
      }

      case 'P6': {
        // GET /audit/v1/rbac/clubs/:club_id
        // Allowed for all roles within own tenant; denied for foreign tenant
        const clubId = params.club_id;
        const club = await RosterRepository.findClubById(clubId);

        if (club && club.tenant_id === user.tenant_id) {
          return true;
        }
        throw ApiError.forbidden('Cross-tenant club access is forbidden.');
      }

      case 'P7': {
        // GET /audit/v1/rbac/platform/config: super_admin only
        throw ApiError.forbidden('Only super_admin may access platform configuration.');
      }

      default:
        throw ApiError.forbidden('Unknown authorization probe.');
    }
  }
}

module.exports = {
  RbacPolicy,
};
