'use strict';

/**
 * RBAC Permission Identifiers for Domain Operations and Probe Endpoints (Section 5.13)
 */
const PERMISSIONS = Object.freeze({
  // Section 5.13 Authorization Probe Operations
  PROBE_TENANTS_MANAGE: 'probe:tenants:manage',       // P1
  PROBE_FIXTURES_MANAGE: 'probe:fixtures:manage',     // P2
  PROBE_ROSTER_MANAGE: 'probe:roster:manage',         // P3
  PROBE_PRODUCTS_MANAGE: 'probe:products:manage',     // P4
  PROBE_PLAYERS_UPDATE: 'probe:players:update',       // P5
  PROBE_CLUBS_READ: 'probe:clubs:read',               // P6
  PROBE_PLATFORM_CONFIG: 'probe:platform:config',     // P7

  // General Domain Permissions
  SPORTS_CREATE: 'sports:create',
  FIXTURES_CREATE: 'fixtures:create',
  LEAGUES_CREATE: 'leagues:create',
  EVENTS_APPEND: 'events:append',
  ROSTER_TRANSFER: 'roster:transfer',
  CHECKOUT_PROCESS: 'checkout:process',
  INVENTORY_READ: 'inventory:read',
});

module.exports = {
  PERMISSIONS,
};
