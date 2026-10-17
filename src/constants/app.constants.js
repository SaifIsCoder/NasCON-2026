'use strict';

/**
 * Application-wide defaults and system configurations
 */
const APP_CONSTANTS = Object.freeze({
  DEFAULT_PORT: 8080,
  DEFAULT_SEED: 42,
  MAX_PAYLOAD_SIZE: '1mb',
  DEFAULT_CURRENCY: 'PKR',
  DEFAULT_TOKEN_EXPIRY: '24h',
  DEMO_PASSWORD: 'Nascon@26',
  RATE_LIMIT_WINDOW_MS: 10000, // 10 seconds
  RATE_LIMIT_MAX_REQUESTS: 100, // 100 req per 10s
  WELCOME_DISCOUNT_CODE: 'WELCOME10',
  WELCOME_DISCOUNT_PERCENT: 10,
});

module.exports = {
  APP_CONSTANTS,
};
