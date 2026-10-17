'use strict';

/**
 * Date Utility Helpers
 */

function toIsoString(date = new Date()) {
  return (date instanceof Date ? date : new Date(date)).toISOString();
}

function now() {
  return new Date();
}

module.exports = {
  toIsoString,
  now,
};
