'use strict';

/**
 * League Authorization Policy (Section 5.8, 5.13)
 */

const { ROLES } = require('../constants/roles.constants');
const { ApiError } = require('../utils/api-error');

class LeaguePolicy {
  static canManageLeagueFixtures(user, targetLeagueId) {
    if (!user) throw ApiError.unauthorized('Authentication required.');
    if (user.role === ROLES.SUPER_ADMIN) return true;
    if (user.role === ROLES.LEAGUE_ORGANIZER && user.league_id === targetLeagueId) return true;
    throw ApiError.forbidden('Only the assigned league organizer may manage fixtures for this league.');
  }
}

module.exports = {
  LeaguePolicy,
};
