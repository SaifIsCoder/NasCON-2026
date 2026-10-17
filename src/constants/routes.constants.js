'use strict';

/**
 * Official Route Paths for NaSCon '26 Part I Specification (Section 5.1, 5.13)
 */
const ROUTES = Object.freeze({
  HEALTH: '/health',
  RESET: '/audit/v1/reset',
  SPORTS: '/audit/v1/sports',
  FIXTURES: '/audit/v1/fixtures',
  LEAGUES: '/audit/v1/leagues',
  EVENTS: '/audit/v1/events',
  SCORE: '/audit/v1/score/:match_id',
  STANDINGS: '/audit/v1/standings/:league_id',
  ROSTER_SETUP: '/audit/v1/roster/setup',
  ROSTER_TRANSFER: '/audit/v1/roster/transfer',
  ROSTER_HISTORY: '/audit/v1/roster/history/:player_id',
  CHECKOUT: '/audit/v1/checkout',
  INVENTORY: '/audit/v1/inventory/:variant_id',
  RBAC_MATRIX: '/audit/v1/rbac-matrix',
  RBAC_TENANTS: '/audit/v1/rbac/tenants',
  RBAC_FIXTURES: '/audit/v1/rbac/leagues/:league_id/fixtures',
  RBAC_ROSTER: '/audit/v1/rbac/clubs/:club_id/roster',
  RBAC_PRODUCTS: '/audit/v1/rbac/clubs/:club_id/products',
  RBAC_PLAYERS: '/audit/v1/rbac/players/:player_id',
  RBAC_CLUBS: '/audit/v1/rbac/clubs/:club_id',
  RBAC_CONFIG: '/audit/v1/rbac/platform/config',
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_LOGIN_ALT: '/auth/login',
  PING: '/api/v1/ping',
  OFFLINE_SYNC: '/audit/v1/offline-sync',
});

module.exports = {
  ROUTES,
};
