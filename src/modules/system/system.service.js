'use strict';

/**
 * System Service for Health Probes and Audit Baseline Reset
 * Implements Section 5.4 (Readiness Probe) and Section 5.5 (Reset and Baseline Data).
 */

const crypto = require('crypto');
const db = require('../../db');
const { hashPassword } = require('../auth/auth.service');

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
    password_hash: hashPassword('Nascon@26'),
    role: 'super_admin',
    tenant_id: null,
    league_id: null,
    club_id: null,
    player_id: null,
  },
  {
    user_id: 'usr-org-001',
    email: 'organizer@nascon.test',
    password_hash: hashPassword('Nascon@26'),
    role: 'league_organizer',
    tenant_id: 'tenant-alpha',
    league_id: 'league-alpha-1',
    club_id: null,
    player_id: null,
  },
  {
    user_id: 'usr-mgr-001',
    email: 'manager@nascon.test',
    password_hash: hashPassword('Nascon@26'),
    role: 'club_manager',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: 'club-alpha-1',
    player_id: null,
  },
  {
    user_id: 'usr-player-001',
    email: 'player@nascon.test',
    password_hash: hashPassword('Nascon@26'),
    role: 'player',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: null,
    player_id: 'player-alpha-1',
  },
  {
    user_id: 'usr-viewer-001',
    email: 'viewer@nascon.test',
    password_hash: hashPassword('Nascon@26'),
    role: 'viewer',
    tenant_id: 'tenant-alpha',
    league_id: null,
    club_id: null,
    player_id: null,
  },
];

/**
 * Check database connectivity and baseline data presence.
 * Returns { healthy: true } if DB is reachable and all baseline entities exist.
 */
async function checkHealth() {
  try {
    // 1. Verify DB connectivity
    await db.query('SELECT 1');

    // 2. Verify Tenants (tenant-alpha, tenant-beta)
    const tenants = await db.query(
      `SELECT tenant_id FROM tenants WHERE tenant_id IN ('tenant-alpha', 'tenant-beta')`
    );
    if (tenants.rows.length < 2) {
      return { healthy: false, reason: 'Baseline tenants not seeded' };
    }

    // 3. Verify Sports (4 baseline sports)
    const sports = await db.query(
      `SELECT sport_id FROM sports WHERE sport_id IN ('football', 'basketball', 'cricket', 'esports')`
    );
    if (sports.rows.length < 4) {
      return { healthy: false, reason: 'Baseline sports not seeded' };
    }

    // 4. Verify Store (prod-jersey-001 and 2 variants)
    const products = await db.query(
      `SELECT product_id FROM products WHERE product_id = 'prod-jersey-001'`
    );
    if (products.rows.length < 1) {
      return { healthy: false, reason: 'Baseline product not seeded' };
    }

    const variants = await db.query(
      `SELECT variant_id FROM product_variants WHERE variant_id IN ('var-jersey-001-M', 'var-jersey-001-L')`
    );
    if (variants.rows.length < 2) {
      return { healthy: false, reason: 'Baseline product variants not seeded' };
    }

    // 5. Verify Demo Users (5 accounts)
    const users = await db.query(
      `SELECT email FROM users WHERE email IN ('admin@nascon.test', 'organizer@nascon.test', 'manager@nascon.test', 'player@nascon.test', 'viewer@nascon.test')`
    );
    if (users.rows.length < 5) {
      return { healthy: false, reason: 'Baseline demo accounts not seeded' };
    }

    // 6. Verify RBAC Hierarchy (3 leagues, 3 clubs, 3 players)
    const leagues = await db.query(
      `SELECT league_id FROM leagues WHERE league_id IN ('league-alpha-1', 'league-alpha-2', 'league-beta-1')`
    );
    if (leagues.rows.length < 3) {
      return { healthy: false, reason: 'Baseline leagues not seeded' };
    }

    const clubs = await db.query(
      `SELECT club_id FROM clubs WHERE club_id IN ('club-alpha-1', 'club-alpha-2', 'club-beta-1')`
    );
    if (clubs.rows.length < 3) {
      return { healthy: false, reason: 'Baseline clubs not seeded' };
    }

    const players = await db.query(
      `SELECT player_id FROM players WHERE player_id IN ('player-alpha-1', 'player-alpha-2', 'player-beta-1')`
    );
    if (players.rows.length < 3) {
      return { healthy: false, reason: 'Baseline players not seeded' };
    }

    return { healthy: true };
  } catch (err) {
    return { healthy: false, reason: 'Database connectivity error' };
  }
}

/**
 * Atomically reset the entire application state and re-seed baseline data (Section 5.5).
 */
async function performReset(body = {}) {
  // Validate seed if provided
  let seed = 42;
  if (body.seed !== undefined) {
    if (typeof body.seed !== 'number' || !Number.isInteger(body.seed) || body.seed < 0) {
      const err = new Error('Invalid seed: must be a non-negative integer.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = { fields: ['seed'] };
      throw err;
    }
    seed = body.seed;
  }

  // Validate stock map if provided
  const stockMap = {
    'var-jersey-001-M': 1,
    'var-jersey-001-L': 5,
  };

  if (body.stock !== undefined) {
    if (
      typeof body.stock !== 'object' ||
      body.stock === null ||
      Array.isArray(body.stock)
    ) {
      const err = new Error('Invalid stock: must be a map of variant_id to non-negative integer.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = { fields: ['stock'] };
      throw err;
    }

    for (const [varId, qty] of Object.entries(body.stock)) {
      if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 0) {
        const err = new Error(`Invalid stock for variant ${varId}: must be a non-negative integer.`);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        err.details = { fields: ['stock'] };
        throw err;
      }
      stockMap[varId] = qty;
    }
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Wipe transient application state in order (preserves schema & migrations)
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

    // 2. Seed Tenants (Section 5.5)
    await client.query(
      `INSERT INTO tenants (tenant_id, name) VALUES 
       ('tenant-alpha', 'Alpha Sports'),
       ('tenant-beta', 'Beta Athletics')`
    );

    // 3. Seed Sports (Section 5.5, 5.6)
    for (const sport of BASELINE_SPORTS) {
      await client.query(
        `INSERT INTO sports (sport_id, name, scoring_model, config) VALUES ($1, $2, $3, $4)`,
        [sport.sport_id, sport.name, sport.scoring_model, JSON.stringify(sport.config)]
      );
    }

    // 4. Seed Store (prod-jersey-001, variants, discount WELCOME10)
    await client.query(
      `INSERT INTO products (product_id, tenant_id, name) VALUES 
       ('prod-jersey-001', 'tenant-alpha', 'Alpha Match Jersey')`
    );

    await client.query(
      `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved) VALUES 
       ('var-jersey-001-M', 'prod-jersey-001', 'Alpha Match Jersey M', 450000, 'PKR', $1, 0),
       ('var-jersey-001-L', 'prod-jersey-001', 'Alpha Match Jersey L', 450000, 'PKR', $2, 0)`,
      [stockMap['var-jersey-001-M'], stockMap['var-jersey-001-L']]
    );

    // Insert any extra variants specified in custom stock
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

    await client.query(
      `INSERT INTO discounts (code, percent, active) VALUES 
       ('WELCOME10', 10, true)`
    );

    // 5. Seed RBAC Hierarchy (Section 5.5)
    await client.query(
      `INSERT INTO leagues (league_id, tenant_id, sport_id, name) VALUES 
       ('league-alpha-1', 'tenant-alpha', 'football', 'Alpha League 1'),
       ('league-alpha-2', 'tenant-alpha', 'football', 'Alpha League 2'),
       ('league-beta-1', 'tenant-beta', 'football', 'Beta League 1')`
    );

    await client.query(
      `INSERT INTO clubs (club_id, tenant_id, name) VALUES 
       ('club-alpha-1', 'tenant-alpha', 'Alpha Club 1'),
       ('club-alpha-2', 'tenant-alpha', 'Alpha Club 2'),
       ('club-beta-1', 'tenant-beta', 'Beta Club 1')`
    );

    await client.query(
      `INSERT INTO players (player_id, club_id, tenant_id, name, position) VALUES 
       ('player-alpha-1', 'club-alpha-1', 'tenant-alpha', 'Alpha Player 1', 'Forward'),
       ('player-alpha-2', 'club-alpha-2', 'tenant-alpha', 'Alpha Player 2', 'Midfielder'),
       ('player-beta-1', 'club-beta-1', 'tenant-beta', 'Beta Player 1', 'Defender')`
    );

    // 6. Seed Demo Accounts (Section 8.3)
    for (const user of DEMO_USERS) {
      await client.query(
        `INSERT INTO users (user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

    // 7. Seed Audit Reset Metadata
    await client.query(
      `INSERT INTO audit_reset_state (id, seed) VALUES (1, $1)`,
      [seed]
    );

    await client.query('COMMIT');

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
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  checkHealth,
  performReset,
  BASELINE_SPORTS,
  DEMO_USERS,
};
