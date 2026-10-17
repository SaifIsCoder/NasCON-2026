'use strict';

/**
 * Focused spec test: GET /api/v1/ping (5.13 rate-limit probe).
 * Must return exactly {"pong":true} and, under burst, return 429 RATE_LIMITED
 * with a Retry-After header for the excess requests.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');

describe('Rate-limit probe GET /api/v1/ping (5.13)', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.close();
  });

  it('returns exactly {"pong":true} with HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ping`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { pong: true });
  });

  it('rate-limits a burst: many 429 RATE_LIMITED with a Retry-After header', async () => {
    const responses = await Promise.all(Array.from({ length: 150 }, () => fetch(`${baseUrl}/api/v1/ping`)));
    const limited = responses.filter((r) => r.status === 429);
    assert.ok(limited.length >= 40, `expected >= 40 rate-limited, got ${limited.length}`);
    const sample = limited[0];
    assert.ok(sample.headers.get('retry-after'), 'Retry-After header must be present on 429');
    assert.equal((await sample.json()).error.code, 'RATE_LIMITED');
  });
});
