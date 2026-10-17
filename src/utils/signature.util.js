'use strict';

/**
 * NaSCon '26 Cryptographic Signature Utility (Section 5.3 & Appendix A)
 * Signs payloads using HMAC-SHA256 with DAY1_SALT.
 */

const crypto = require('crypto');
const { canonicalize, compareCodePoints } = require('./canonical-json.util');
const { env } = require('../config/env');

/**
 * Retrieve DAY1_SALT securely
 * @returns {string}
 */
function getDay1Salt() {
  const salt = env.DAY1_SALT || process.env.DAY1_SALT;

  if (!salt) {
    throw new Error(
      'DAY1_SALT environment variable is required and must not be empty. ' +
      'Please supply it via process.env.DAY1_SALT or .env file.'
    );
  }

  return salt;
}

/**
 * Calculates HMAC-SHA256 signature according to Section 5.3 & Appendix A.
 *
 * @param {string} salt
 * @param {string} id - event_id or order_id
 * @param {any} payload
 * @returns {string} 64-char lowercase hexadecimal digest
 */
function signPayload(salt, id, payload) {
  if (!salt || typeof salt !== 'string') {
    throw new Error('Salt must be a non-empty string.');
  }
  if (!id || typeof id !== 'string') {
    throw new Error('Record ID must be a non-empty string.');
  }

  const canonicalJson = canonicalize(payload);
  const message = `${id}|${canonicalJson}`;

  const hmac = crypto.createHmac('sha256', Buffer.from(salt, 'utf8'));
  hmac.update(Buffer.from(message, 'utf8'));
  const digest = hmac.digest('hex').toLowerCase();

  return digest;
}

/**
 * Signs an append-only score event record using DAY1_SALT.
 * @param {string} eventId
 * @param {any} payload
 * @param {string} [saltOverride]
 * @returns {string}
 */
function signEvent(eventId, payload, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return signPayload(salt, eventId, payload);
}

/**
 * Signs a checkout receipt payload using DAY1_SALT.
 * @param {string} orderId
 * @param {any} payload
 * @param {string} [saltOverride]
 * @returns {string}
 */
function signReceipt(orderId, payload, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return signPayload(salt, orderId, payload);
}

/**
 * Constant-time comparison to verify a signature without leaking timing information.
 * @param {string} salt
 * @param {string} id
 * @param {any} payload
 * @param {string} expectedSignature
 * @returns {boolean}
 */
function verifySignature(salt, id, payload, expectedSignature) {
  if (!expectedSignature || typeof expectedSignature !== 'string' || expectedSignature.length !== 64) {
    return false;
  }

  try {
    const actualDigest = signPayload(salt, id, payload);
    const bufActual = Buffer.from(actualDigest, 'utf8');
    const bufExpected = Buffer.from(expectedSignature.toLowerCase(), 'utf8');

    if (bufActual.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufActual, bufExpected);
  } catch (_) {
    return false;
  }
}

/**
 * Verifies an event signature against DAY1_SALT.
 * @param {string} eventId
 * @param {any} payload
 * @param {string} expectedSignature
 * @param {string} [saltOverride]
 * @returns {boolean}
 */
function verifyEventSignature(eventId, payload, expectedSignature, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return verifySignature(salt, eventId, payload, expectedSignature);
}

/**
 * Verifies a receipt signature against DAY1_SALT.
 * @param {string} orderId
 * @param {any} payload
 * @param {string} expectedSignature
 * @param {string} [saltOverride]
 * @returns {boolean}
 */
function verifyReceiptSignature(orderId, payload, expectedSignature, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return verifySignature(salt, orderId, payload, expectedSignature);
}

module.exports = {
  canonicalize,
  compareCodePoints,
  getDay1Salt,
  signPayload,
  signEvent,
  signReceipt,
  verifySignature,
  verifyEventSignature,
  verifyReceiptSignature,
};
