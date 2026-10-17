'use strict';

/**
 * JWT Utility (Section 5.13, 8.3)
 * Enforces HS256 algorithm, payload verification, and expiration.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const JWT_SECRET = env.JWT_SECRET;

/**
 * Issue a signed JWT token bound to user, role, and tenant scope.
 * @param {Object} user
 * @param {string} [expiresIn='24h']
 * @returns {string}
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
 * @param {string} token
 * @returns {Object} decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
};
