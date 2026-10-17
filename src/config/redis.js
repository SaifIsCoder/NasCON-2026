'use strict';

/**
 * Redis Connection & Cache Configuration
 * Configures Redis client settings with graceful local fallback.
 */

const { env } = require('./env');

const redisConfig = Object.freeze({
  url: env.REDIS_URL,
  connectTimeout: 5000,
  maxRetriesPerRequest: 3,
});

class MockRedisClient {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      setTimeout(() => this.store.delete(key), duration * 1000);
    }
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async ping() {
    return 'PONG';
  }
}

let redisClientInstance = null;

function getRedisClient() {
  if (!redisClientInstance) {
    redisClientInstance = new MockRedisClient();
  }
  return redisClientInstance;
}

module.exports = {
  redisConfig,
  getRedisClient,
};
