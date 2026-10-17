'use strict';

/**
 * Secure Password Hashing & Verification Utility (Section 5.13, 8.3)
 * Uses salted scrypt with timing-safe comparison to prevent side-channel timing attacks.
 */

const crypto = require('crypto');

/**
 * Hash a plaintext password using secure salt-derived scrypt.
 * @param {string} password
 * @returns {string} salt:derivedKey
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored secure password hash.
 * Timing-safe comparison to prevent side-channel attacks.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !password || typeof password !== 'string') {
    return false;
  }

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

module.exports = {
  hashPassword,
  verifyPassword,
};
