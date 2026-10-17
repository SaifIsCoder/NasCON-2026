'use strict';

/**
 * Roster Access & Mutation Policy (Section 5.11, 5.13)
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

class RosterPolicy {
  static canManageClubRoster(user, targetClubId) {
    if (!user) throw ApiError.unauthorized('Authentication required.');
    if (user.role === ROLES.SUPER_ADMIN) return true;
    if (user.role === ROLES.CLUB_MANAGER && user.club_id === targetClubId) return true;
    throw ApiError.forbidden('Only club manager of this club may manage roster.');
  }

  static canUpdatePlayerProfile(user, targetPlayerId, playerClubId) {
    if (!user) throw ApiError.unauthorized('Authentication required.');
    if (user.role === ROLES.SUPER_ADMIN) return true;
    if (user.role === ROLES.PLAYER && user.player_id === targetPlayerId) return true;
    if (user.role === ROLES.CLUB_MANAGER && user.club_id === playerClubId) return true;
    throw ApiError.forbidden('Not authorized to update this player profile.');
  }
}

module.exports = {
  RosterPolicy,
};
