'use strict';

/**
 * NaSCon '26 Official Cryptographic Signature Module
 * Implements HMAC-SHA256 Canonical JSON signing in accordance with Section 1.1, Section 5.3, and Appendix A.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compare two strings ascending by Unicode code point values.
 * Ensures consistent sorting regardless of JavaScript string collation or V8 property ordering.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} -1, 0, or 1
 */
function compareCodePoints(a, b) {
  if (a === b) return 0;
  const iterA = a[Symbol.iterator]();
  const iterB = b[Symbol.iterator]();
  while (true) {
    const nextA = iterA.next();
    const nextB = iterB.next();
    if (nextA.done && nextB.done) return 0;
    if (nextA.done) return -1;
    if (nextB.done) return 1;
    const cpA = nextA.value.codePointAt(0);
    const cpB = nextB.value.codePointAt(0);
    if (cpA !== cpB) {
      return cpA < cpB ? -1 : 1;
    }
  }
}

/**
 * Canonicalizes a JSON-serializable value according to Section 5.3:
 * - Recursively sorts object keys in ascending Unicode code-point order.
 * - Compact separators (',', ':') with no extraneous whitespace.
 * - Preserves array order.
 * - Non-ASCII characters encoded directly as UTF-8 (not escaped with \uXXXX).
 * - Integers formatted without decimal points.
 * - Lowercase true, false, and null.
 *
 * @param {any} payload
 * @returns {string} Canonical JSON string
 */
function canonicalize(payload) {
  if (payload === null || payload === undefined) {
    return 'null';
  }

  const type = typeof payload;

  if (type === 'boolean') {
    return payload ? 'true' : 'false';
  }

  if (type === 'number') {
    if (!Number.isFinite(payload)) {
      return 'null';
    }
    // Handle -0 -> 0
    if (Object.is(payload, -0)) {
      return '0';
    }
    return payload.toString();
  }

  if (type === 'string') {
    // If the input is already a string that can be parsed as JSON,
    // parse it and canonicalize its structured representation.
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object' && parsed !== null) {
        return canonicalize(parsed);
      }
    } catch (_) {
      // Not a JSON object/array string; treat as literal string
    }
    return JSON.stringify(payload);
  }

  if (Array.isArray(payload)) {
    const items = payload.map((elem) => (elem === undefined ? 'null' : canonicalize(elem)));
    return '[' + items.join(',') + ']';
  }

  if (type === 'object') {
    if (payload instanceof Date) {
      return JSON.stringify(payload.toISOString());
    }

    // Sort object keys ascending by Unicode code point
    const keys = Object.keys(payload).sort(compareCodePoints);
    const entries = [];

    for (const key of keys) {
      const val = payload[key];
      // Omit undefined values and functions per standard JSON serialization
      if (val !== undefined && typeof val !== 'function') {
        entries.push(JSON.stringify(key) + ':' + canonicalize(val));
      }
    }

    return '{' + entries.join(',') + '}';
  }

  return 'null';
}

/**
 * Retrieves DAY1_SALT from the environment or local .env fallback.
 * Throws an explicit error if missing. Never logs or leaks the salt.
 *
 * @returns {string} The active salt
 */
function getDay1Salt() {
  let salt = process.env.DAY1_SALT;

  if (!salt) {
    // Attempt reading from .env file in project root if available locally
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('DAY1_SALT=') && !trimmed.startsWith('#')) {
            const val = trimmed.slice('DAY1_SALT='.length).trim().replace(/^["']|["']$/g, '');
            if (val) {
              salt = val;
              break;
            }
          }
        }
      }
    } catch (_) {
      // Ignore file reading errors
    }
  }

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
 * Recipe:
 *   Key: UTF-8 bytes of salt (not hex-decoded, not trimmed).
 *   Message: id + "|" + canonicalize(payload) as UTF-8 bytes.
 *   Output: exactly 64 lowercase hexadecimal characters.
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
 * Used for POST /audit/v1/events and score event timelines in GET /audit/v1/score/{match_id}.
 *
 * @param {string} eventId
 * @param {any} payload
 * @param {string} [saltOverride]
 * @returns {string} 64-char hex signature
 */
function signEvent(eventId, payload, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return signPayload(salt, eventId, payload);
}

/**
 * Signs a checkout receipt payload using DAY1_SALT.
 * Used for POST /audit/v1/checkout.
 *
 * @param {string} orderId
 * @param {any} payload
 * @param {string} [saltOverride]
 * @returns {string} 64-char hex signature
 */
function signReceipt(orderId, payload, saltOverride) {
  const salt = saltOverride !== undefined ? saltOverride : getDay1Salt();
  return signPayload(salt, orderId, payload);
}

/**
 * Constant-time comparison to verify a signature without leaking timing information.
 *
 * @param {string} salt
 * @param {string} id
 * @param {any} payload
 * @param {string} expectedSignature
 * @returns {boolean} True if signature matches
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
 *
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
 *
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
