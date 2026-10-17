'use strict';

/**
 * Official Five Roles for NaSCon '26 Part I Specification (Section 3.3, 5.13, 8.3)
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  LEAGUE_ORGANIZER: 'league_organizer',
  CLUB_MANAGER: 'club_manager',
  PLAYER: 'player',
  VIEWER: 'viewer',
});

const ALL_ROLES = Object.freeze([
  ROLES.SUPER_ADMIN,
  ROLES.LEAGUE_ORGANIZER,
  ROLES.CLUB_MANAGER,
  ROLES.PLAYER,
  ROLES.VIEWER,
]);

module.exports = {
  ROLES,
  ALL_ROLES,
};
