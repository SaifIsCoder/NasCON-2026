'use strict';

/**
 * Automated Test for Express Server Foundation, Health Probe, and HTTP API Workflows
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');
const { verifyEventSignature, verifyReceiptSignature } = require('../src/utils/signature');

describe('Express Server Foundation & HTTP Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Run database migrations and seed test fixture
    await db.migrate();
    await db.query("DELETE FROM match_events WHERE match_id LIKE 'm-http-%'");
    await db.query("DELETE FROM matches WHERE match_id LIKE 'm-http-%'");
    await db.query("DELETE FROM orders WHERE order_id LIKE 'ord-http-%'");
    await db.query("DELETE FROM product_variants WHERE variant_id = 'var-http-M'");
    await db.query("DELETE FROM products WHERE product_id = 'prod-http-001'");

    await db.query("INSERT INTO products (product_id, tenant_id, name) VALUES ('prod-http-001', 'tenant-alpha', 'Jersey') ON CONFLICT DO NOTHING");
    await db.query(
      `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved)
       VALUES ('var-http-M', 'prod-http-001', 'Jersey M', 450000, 'PKR', 10, 0)
       ON CONFLICT (variant_id) DO UPDATE SET stock = 10`
    );

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.close();
  });

  it('GET /health returns HTTP 200 with {"status":"ok"}', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, { status: 'ok' });
  });

  it('rejects bodies larger than 1MB with HTTP 413 PAYLOAD_TOO_LARGE', async () => {
    const largeString = 'a'.repeat(1024 * 1024 + 100);
    const body = JSON.stringify({ large: largeString });

    const res = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });

    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.error.code, 'PAYLOAD_TOO_LARGE');
  });

  it('rejects malformed JSON with HTTP 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json syntax}',
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'VALIDATION_ERROR');
  });

  it('POST /audit/v1/events creates a match and signs score event over HTTP', async () => {
    // 1. Initialize match
    const initRes = await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: 'evt-http-init-1',
        match_id: 'm-http-1',
        type: 'match_init',
        payload: { sport_id: 'football', home_team_id: 'team-1', away_team_id: 'team-2' },
      }),
    });
    assert.equal(initRes.status, 201);
    const initData = await initRes.json();
    assert.match(initData.signature, /^[0-9a-f]{64}$/);

    // 2. Start match
    await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: 'evt-http-start-2',
        match_id: 'm-http-1',
        type: 'match_start',
        payload: {},
      }),
    });

    // 3. Append score event
    const scoreRes = await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: 'evt-http-score-3',
        match_id: 'm-http-1',
        type: 'score',
        payload: { team_id: 'team-1', event_type: 'goal' },
      }),
    });
    assert.equal(scoreRes.status, 201);
    const scoreData = await scoreRes.json();
    assert.equal(scoreData.sequence, 3);
    assert.equal(scoreData.match_version, 3);
    assert.match(scoreData.signature, /^[0-9a-f]{64}$/);

    const isSigValid = verifyEventSignature(
      'evt-http-score-3',
      { team_id: 'team-1', event_type: 'goal' },
      scoreData.signature
    );
    assert.equal(isSigValid, true);

    // 4. Verify score query
    const scoreProjRes = await fetch(`${baseUrl}/audit/v1/score/m-http-1`);
    assert.equal(scoreProjRes.status, 200);
    const projData = await scoreProjRes.json();
    assert.equal(projData.events.length, 3);
  });

  it('POST /audit/v1/checkout executes purchase and returns signed receipt over HTTP', async () => {
    const orderId = 'ord-http-201';
    const checkoutRes = await fetch(`${baseUrl}/audit/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        customer_id: 'cust-http-1',
        items: [{ variant_id: 'var-http-M', quantity: 1 }],
        discount_code: 'WELCOME10',
        payment: { token: 'tok_success' },
      }),
    });

    assert.equal(checkoutRes.status, 201);
    const orderData = await checkoutRes.json();
    assert.equal(orderData.order_id, orderId);
    assert.equal(orderData.status, 'paid');
    assert.equal(orderData.total_minor, 405000); // 450000 - 10%
    assert.match(orderData.receipt.signature, /^[0-9a-f]{64}$/);

    const isSigValid = verifyReceiptSignature(
      orderId,
      orderData.receipt.payload,
      orderData.receipt.signature
    );
    assert.equal(isSigValid, true);
  });
});
