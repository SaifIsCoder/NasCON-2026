'use strict';

/**
 * Authentication and Five-Role RBAC Service
 * Implements Section 3.3, 5.2, 5.13, 8.3 of NaSCon '26 Part I Specification.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.DAY1_SALT || 'nascon-secret-key-2026';

/**
 * Hash a plaintext password using secure salt-derived scrypt.
 * Never stores plaintext passwords.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored secure password hash.
 * Timing-safe comparison to prevent side-channel attacks.
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  // scrypt format: salt:key
  if (storedHash.includes(':')) {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Backward-compatible SHA-256 fallback
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  if (storedHash.length === sha.length) {
    return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(sha));
  }

  return false;
}

/**
 * Issue a signed JWT token bound to user, role, and tenant scope.
 * Valid for at least 1 hour (default 24h).
 */
function generateToken(user, expiresIn = '24h') {
  const payload = {
    sub: user.user_id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id || null,
    league_id: user.league_id || null,
    club_id: user.club_id || null,
    player_id: user.player_id || null,
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
  });
}

/**
 * Verify JWT token signature, expiration, and algorithm.
 * Strictly enforces HS256 algorithm and rejects 'alg: none'.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

/**
 * Authenticate user with email and password.
 */
async function login({ email, password }) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    const err = new Error('Email is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = { fields: ['email'] };
    throw err;
  }

  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = { fields: ['password'] };
    throw err;
  }

  const result = await db.query(
    `SELECT user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id 
     FROM users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );

  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'UNAUTHENTICATED';
    err.details = {};
    throw err;
  }

  const token = generateToken(user, '24h');

  return {
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      league_id: user.league_id,
      club_id: user.club_id,
      player_id: user.player_id,
    },
  };
}

/**
 * Generate RBAC tokens and context required by POST /audit/v1/rbac-matrix (Section 5.13).
 */
async function getRbacMatrix() {
  const result = await db.query(
    `SELECT user_id, email, role, tenant_id, league_id, club_id, player_id 
     FROM users 
     WHERE email IN ('admin@nascon.test', 'organizer@nascon.test', 'manager@nascon.test', 'player@nascon.test', 'viewer@nascon.test')`
  );

  const usersByRole = {};
  for (const row of result.rows) {
    usersByRole[row.role] = row;
  }

  // Ensure all 5 roles have users from DB or default seeded profiles
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
      super_admin: generateToken(superAdmin, '24h'),
      league_organizer: generateToken(organizer, '24h'),
      club_manager: generateToken(clubManager, '24h'),
      player: generateToken(player, '24h'),
      viewer: generateToken(viewer, '24h'),
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
 * Evaluate authorization for the 7 official Section 5.13 probe routes.
 * Throws 403 FORBIDDEN if denied.
 */
async function authorizeProbe(probeId, user, params = {}) {
  // Super Admin is platform-wide and allowed on all probe routes
  if (user.role === 'super_admin') {
    return true;
  }

  // Cross-tenant access check: Non-super-admin can never access tenant-beta
  switch (probeId) {
    case 'P1': {
      // POST /audit/v1/rbac/tenants: only super_admin allowed
      throwForbidden();
      break;
    }

    case 'P2': {
      // POST /audit/v1/rbac/leagues/:league_id/fixtures
      // Allowed only for league_organizer on own league (league-alpha-1)
      const leagueId = params.league_id;
      if (user.role === 'league_organizer' && user.league_id && leagueId === user.league_id) {
        return true;
      }
      throwForbidden();
      break;
    }

    case 'P3':
    case 'P4': {
      // POST /audit/v1/rbac/clubs/:club_id/roster (P3)
      // POST /audit/v1/rbac/clubs/:club_id/products (P4)
      // Allowed only for club_manager on own club (club-alpha-1)
      const clubId = params.club_id;
      if (user.role === 'club_manager' && user.club_id && clubId === user.club_id) {
        return true;
      }
      throwForbidden();
      break;
    }

    case 'P5': {
      // PATCH /audit/v1/rbac/players/:player_id
      // Super Admin: A
      // Organizer: D
      // Club Mgr: A (for own club's players)
      // Player: A (self only)
      // Viewer: D
      const playerId = params.player_id;

      if (user.role === 'player') {
        if (user.player_id && playerId === user.player_id) {
          return true;
        }
        throwForbidden();
      }

      if (user.role === 'club_manager') {
        // Look up player's club and tenant
        const pRes = await db.query(
          `SELECT club_id, tenant_id FROM players WHERE player_id = $1`,
          [playerId]
        );
        const playerRow = pRes.rows[0];
        if (
          playerRow &&
          playerRow.tenant_id === user.tenant_id &&
          playerRow.club_id === user.club_id
        ) {
          return true;
        }
        throwForbidden();
      }

      throwForbidden();
      break;
    }

    case 'P6': {
      // GET /audit/v1/rbac/clubs/:club_id
      // Allowed for all roles if club is within own tenant (tenant-alpha)
      // Denied (403) for foreign club (tenant-beta)
      const clubId = params.club_id;
      const cRes = await db.query(
        `SELECT tenant_id FROM clubs WHERE club_id = $1`,
        [clubId]
      );
      const clubRow = cRes.rows[0];

      // If club belongs to user's tenant: allowed
      if (clubRow && clubRow.tenant_id === user.tenant_id) {
        return true;
      }
      throwForbidden();
      break;
    }

    case 'P7': {
      // GET /audit/v1/rbac/platform/config: only super_admin allowed
      throwForbidden();
      break;
    }

    default:
      throwForbidden();
  }
}

function throwForbidden(message = 'Access denied.') {
  const err = new Error(message);
  err.statusCode = 403;
  err.code = 'FORBIDDEN';
  err.details = {};
  throw err;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  login,
  getRbacMatrix,
  authorizeProbe,
  throwForbidden,
  JWT_SECRET,
};
