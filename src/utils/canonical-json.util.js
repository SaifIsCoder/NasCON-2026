'use strict';

/**
 * Canonical JSON Serialization Utility (Section 5.3 & Appendix A)
 * Enforces Unicode code-point ascending key sorting, compact separators,
 * non-ASCII UTF-8 preservation, and standard numeric formatting.
 */

/**
 * Compare two strings ascending by Unicode code point values.
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
 * Canonicalizes a JSON-serializable value according to Section 5.3
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
    if (Object.is(payload, -0)) {
      return '0';
    }
    return payload.toString();
  }

  if (type === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object' && parsed !== null) {
        return canonicalize(parsed);
      }
    } catch (_) {
      // Treat as literal string
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

    const keys = Object.keys(payload).sort(compareCodePoints);
    const entries = [];

    for (const key of keys) {
      const val = payload[key];
      if (val !== undefined && typeof val !== 'function') {
        entries.push(JSON.stringify(key) + ':' + canonicalize(val));
      }
    }

    return '{' + entries.join(',') + '}';
  }

  return 'null';
}

module.exports = {
  compareCodePoints,
  canonicalize,
};
