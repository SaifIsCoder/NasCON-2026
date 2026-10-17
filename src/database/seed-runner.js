'use strict';

/**
 * Baseline Database Seed Runner (Section 5.5, 8.3)
 * Provides centralized baseline fixtures and atomic data reset routines.
 */

const { hashPassword } = require('../utils/password.util');
const { APP_CONSTANTS } = require('../constants/app.constants');

const BASELINE_SPORTS = [
  {
    sport_id: 'football',
    name: 'Football',
    scoring_model: 'event',
    config: {
      sport_id: 'football',
      name: 'Football',
      scoring_model: 'event',
      periods: { count: 2, duration_minutes: 45 },
      scoring_events: { goal: { points: 1 } },
      draw_allowed: true,
      overtime: { policy: 'none' },
      tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
      roster: { min_squad_size: 11, max_squad_size: 25, required_positions: { gk: 1 } },
    },
  },
  {
    sport_id: 'basketball',
    name: 'Basketball',
    scoring_model: 'event',
    config: {
      sport_id: 'basketball',
      name: 'Basketball',
      scoring_model: 'event',
      periods: { count: 4, duration_minutes: 12 },
      scoring_events: {
        free_throw: { points: 1 },
        two_pointer: { points: 2 },
        three_pointer: { points: 3 },
      },
      draw_allowed: false,
      overtime: { policy: 'extra_time', duration_minutes: 5 },
      tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
      roster: { min_squad_size: 5, max_squad_size: 15, required_positions: {} },
    },
  },
  {
    sport_id: 'cricket',
    name: 'Cricket',
    scoring_model: 'innings',
    config: {
      sport_id: 'cricket',
      name: 'Cricket',
      scoring_model: 'innings',
      periods: {
        innings_per_team: 1,
        overs_per_innings: 20,
        balls_per_over: 6,
        wickets_per_innings: 10,
      },
      scoring_events: {
        dot_ball: { runs: 0, legal_ball: true, wicket: false },
        single: { runs: 1, legal_ball: true, wicket: false },
        two: { runs: 2, legal_ball: true, wicket: false },
        four: { runs: 4, legal_ball: true, wicket: false },
        six: { runs: 6, legal_ball: true, wicket: false },
        wide: { runs: 1, legal_ball: false, wicket: false },
        no_ball: { runs: 1, legal_ball: false, wicket: false },
        wicket: { runs: 0, legal_ball: true, wicket: true },
      },
      draw_allowed: true,
      overtime: { policy: 'super_over' },
      tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
      roster: { min_squad_size: 11, max_squad_size: 18, required_positions: { wicketkeeper: 1 } },
    },
  },
  {
    sport_id: 'esports',
    name: 'Esports',
    scoring_model: 'round',
    config: {
      sport_id: 'esports',
      name: 'Esports',
      scoring_model: 'round',
      periods: { best_of: 3 },
      scoring_events: { round_win: { rounds: 1 } },
      draw_allowed: false,
      overtime: { policy: 'none' },
      tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
      roster: { min_squad_size: 5, max_squad_size: 8, required_positions: {} },
    },
  },
];

const DEMO_USERS = [
  {
    user_id: 'usr-admin-001',
    email: 'admin@nascon.test',
    password_hash: hashPassword(APP_CONSTANTS.DEMO_PASSWORD),
    role: 'super_admin',
    tenant_id: null,
    league_id: null,
    club_id: null,
    player_id: null,
  },
  {
    user_id: 'usr-org-001',
    email: 'organizer@nascon.test',
    password_hash: hashPassword(APP_CONSTANTS.DEMO_PASSWORD),
    role: 'league_organizer',
    tenant_id: 'tenant-alpha',
    league_id: 'league-alpha-1',
    club_id: null,
    player_id: null,
  },
  {
    user_id: 'usr-mgr-001',
    email: 'manager@nascon.test',
    password_hash: hashPassword(APP_CONSTANTS.DEMO_PASSWORD),
    role: 'club_manager',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: 'club-alpha-1',
    player_id: null,
  },
  {
    user_id: 'usr-player-001',
    email: 'player@nascon.test',
    password_hash: hashPassword(APP_CONSTANTS.DEMO_PASSWORD),
    role: 'player',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: null,
    player_id: 'player-alpha-1',
  },
  {
    user_id: 'usr-viewer-001',
    email: 'viewer@nascon.test',
    password_hash: hashPassword(APP_CONSTANTS.DEMO_PASSWORD),
    role: 'viewer',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: null,
    player_id: null,
  },
];

/**
 * Wipe all transient state without modifying schema migrations.
 * @param {import('pg').PoolClient} client
 */
async function wipeTransientData(client) {
  await client.query('DELETE FROM match_events');
  await client.query('DELETE FROM matches');
  await client.query('DELETE FROM orders');
  await client.query('DELETE FROM users');
  await client.query('DELETE FROM players');
  await client.query('DELETE FROM clubs');
  await client.query('DELETE FROM leagues');
  await client.query('DELETE FROM product_variants');
  await client.query('DELETE FROM products');
  await client.query('DELETE FROM discounts');
  await client.query('DELETE FROM sports');
  await client.query('DELETE FROM tenants');
  await client.query('DELETE FROM audit_reset_state');
}

/**
 * Seed baseline data fixtures inside an active transaction client.
 * @param {import('pg').PoolClient} client
 * @param {Object} options
 * @param {number} [options.seed=42]
 * @param {Record<string, number>} [options.stockMap]
 */
async function seedBaselineData(client, { seed = 42, stockMap = {} } = {}) {
  // 1. Tenants
  await client.query(
    `INSERT INTO tenants (tenant_id, name) VALUES 
     ('tenant-alpha', 'Alpha Sports'),
     ('tenant-beta', 'Beta Athletics')
     ON CONFLICT (tenant_id) DO NOTHING`
  );

  // 2. Sports
  for (const sport of BASELINE_SPORTS) {
    await client.query(
      `INSERT INTO sports (sport_id, name, scoring_model, config) VALUES ($1, $2, $3, $4)
       ON CONFLICT (sport_id) DO UPDATE SET name = EXCLUDED.name, scoring_model = EXCLUDED.scoring_model, config = EXCLUDED.config`,
      [sport.sport_id, sport.name, sport.scoring_model, JSON.stringify(sport.config)]
    );
  }

  // 3. Products & Product Variants
  await client.query(
    `INSERT INTO products (product_id, tenant_id, name) VALUES 
     ('prod-jersey-001', 'tenant-alpha', 'Alpha Match Jersey')
     ON CONFLICT (product_id) DO NOTHING`
  );

  const defaultStockM = stockMap['var-jersey-001-M'] !== undefined ? stockMap['var-jersey-001-M'] : 1;
  const defaultStockL = stockMap['var-jersey-001-L'] !== undefined ? stockMap['var-jersey-001-L'] : 5;

  await client.query(
    `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved) VALUES 
     ('var-jersey-001-M', 'prod-jersey-001', 'Alpha Match Jersey M', 450000, 'PKR', $1, 0),
     ('var-jersey-001-L', 'prod-jersey-001', 'Alpha Match Jersey L', 450000, 'PKR', $2, 0)
     ON CONFLICT (variant_id) DO UPDATE SET stock = EXCLUDED.stock, reserved = 0`,
    [defaultStockM, defaultStockL]
  );

  // Extra custom variants
  for (const [varId, qty] of Object.entries(stockMap)) {
    if (varId !== 'var-jersey-001-M' && varId !== 'var-jersey-001-L') {
      await client.query(
        `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved)
         VALUES ($1, 'prod-jersey-001', $2, 450000, 'PKR', $3, 0)
         ON CONFLICT (variant_id) DO UPDATE SET stock = EXCLUDED.stock`,
        [varId, varId, qty]
      );
    }
  }

  // 4. Discounts
  await client.query(
    `INSERT INTO discounts (code, percent, active) VALUES 
     ('WELCOME10', 10, true)
     ON CONFLICT (code) DO NOTHING`
  );

  // 5. Leagues
  await client.query(
    `INSERT INTO leagues (league_id, tenant_id, sport_id, name) VALUES 
     ('league-alpha-1', 'tenant-alpha', 'football', 'Alpha League 1'),
     ('league-alpha-2', 'tenant-alpha', 'football', 'Alpha League 2'),
     ('league-beta-1', 'tenant-beta', 'football', 'Beta League 1')
     ON CONFLICT (league_id) DO NOTHING`
  );

  // 6. Clubs
  await client.query(
    `INSERT INTO clubs (club_id, tenant_id, name) VALUES 
     ('club-alpha-1', 'tenant-alpha', 'Alpha Club 1'),
     ('club-alpha-2', 'tenant-alpha', 'Alpha Club 2'),
     ('club-beta-1', 'tenant-beta', 'Beta Club 1')
     ON CONFLICT (club_id) DO NOTHING`
  );

  // 7. Players
  await client.query(
    `INSERT INTO players (player_id, club_id, tenant_id, name, position) VALUES 
     ('player-alpha-1', 'club-alpha-1', 'tenant-alpha', 'Alpha Player 1', 'Forward'),
     ('player-alpha-2', 'club-alpha-2', 'tenant-alpha', 'Alpha Player 2', 'Midfielder'),
     ('player-beta-1', 'club-beta-1', 'tenant-beta', 'Beta Player 1', 'Defender')
     ON CONFLICT (player_id) DO NOTHING`
  );

  // 8. Demo Users
  for (const user of DEMO_USERS) {
    await client.query(
      `INSERT INTO users (user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET 
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         tenant_id = EXCLUDED.tenant_id,
         league_id = EXCLUDED.league_id,
         club_id = EXCLUDED.club_id,
         player_id = EXCLUDED.player_id`,
      [
        user.user_id,
        user.email,
        user.password_hash,
        user.role,
        user.tenant_id,
        user.league_id,
        user.club_id,
        user.player_id,
      ]
    );
  }

  // 9. Audit Reset State
  await client.query(
    `INSERT INTO audit_reset_state (id, seed) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET seed = EXCLUDED.seed, reset_at = NOW()`,
    [seed]
  );
}

module.exports = {
  BASELINE_SPORTS,
  DEMO_USERS,
  wipeTransientData,
  seedBaselineData,
};
