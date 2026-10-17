'use strict';

/**
 * Integration Test Suite for PostgreSQL Persistence Layer
 * Tests score-event append-only stream, checkout transactions, concurrency safety,
 * rollback behavior, and cryptographic signature verification.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/db');
const { appendEvent, getScore } = require('../src/modules/events/event.service');
const { processCheckout, getInventory } = require('../src/modules/store/checkout.service');
const { verifyEventSignature, verifyReceiptSignature } = require('../src/utils/signature');

describe('PostgreSQL Persistence Layer: Event Sourcing & Checkout', () => {

  before(async () => {
    // Ensure migrations are run before testing
    await db.migrate();

    // Clean up test data
    await db.query("DELETE FROM match_events WHERE match_id LIKE 'm-test-%'");
    await db.query("DELETE FROM matches WHERE match_id LIKE 'm-test-%'");
    await db.query("DELETE FROM orders WHERE order_id LIKE 'ord-test-%' OR order_id LIKE 'ord-burst-%' OR order_id LIKE 'ord-declined-%' OR order_id LIKE 'ord-excess-%'");
    await db.query("DELETE FROM product_variants WHERE variant_id = 'var-test-M'");
    await db.query("DELETE FROM products WHERE product_id = 'prod-test-001'");

    // Seed test product and variant
    await db.query(
      "INSERT INTO products (product_id, tenant_id, name) VALUES ('prod-test-001', 'tenant-alpha', 'Test Jersey') ON CONFLICT DO NOTHING"
    );
    await db.query(
      `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved)
       VALUES ('var-test-M', 'prod-test-001', 'Test Jersey M', 450000, 'PKR', 5, 0)
       ON CONFLICT (variant_id) DO UPDATE SET stock = 5`
    );
  });

  after(async () => {
    await db.close();
  });

  describe('1. Match Event Sourcing Persistence & Signatures (Section 5.9)', () => {
    const matchId = 'm-test-101';

    it('creates a match stream via match_init and assigns valid signature', async () => {
      const res = await appendEvent({
        event_id: 'evt-init-001',
        match_id: matchId,
        type: 'match_init',
        payload: {
          sport_id: 'football',
          home_team_id: 'team-a',
          away_team_id: 'team-b',
          league_id: 'league-test-1',
        },
      });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.event_id, 'evt-init-001');
      assert.equal(res.data.sequence, 1);
      assert.equal(res.data.match_version, 1);
      assert.match(res.data.signature, /^[0-9a-f]{64}$/);

      // Verify the persisted signature matches DAY1_SALT
      const isValid = verifyEventSignature(
        res.data.event_id,
        {
          sport_id: 'football',
          home_team_id: 'team-a',
          away_team_id: 'team-b',
          league_id: 'league-test-1',
        },
        res.data.signature
      );
      assert.equal(isValid, true, 'Event signature must verify with DAY1_SALT');
    });

    it('transitions match status to in_progress via match_start', async () => {
      const res = await appendEvent({
        event_id: 'evt-start-002',
        match_id: matchId,
        type: 'match_start',
        payload: {},
      });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.sequence, 2);
      assert.equal(res.data.match_version, 2);
    });

    it('persists a score event with exact sequential order and signature', async () => {
      const res = await appendEvent({
        event_id: 'evt-score-003',
        match_id: matchId,
        type: 'score',
        payload: { team_id: 'team-a', event_type: 'goal' },
      });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.sequence, 3);
      assert.equal(res.data.match_version, 3);

      const isValid = verifyEventSignature(
        'evt-score-003',
        { team_id: 'team-a', event_type: 'goal' },
        res.data.signature
      );
      assert.equal(isValid, true);
    });

    it('handles idempotent replay of identical event without duplicate sequence', async () => {
      const res = await appendEvent({
        event_id: 'evt-score-003',
        match_id: matchId,
        type: 'score',
        payload: { team_id: 'team-a', event_type: 'goal' },
      });

      assert.equal(res.statusCode, 200, 'Replaying identical event returns 200');
      assert.equal(res.data.sequence, 3);
    });

    it('rejects reuse of event_id with different body with 409 DUPLICATE_EVENT_ID', async () => {
      await assert.rejects(
        async () => {
          await appendEvent({
            event_id: 'evt-score-003',
            match_id: matchId,
            type: 'score',
            payload: { team_id: 'team-b', event_type: 'goal' }, // different team
          });
        },
        (err) => err.statusCode === 409 && err.code === 'DUPLICATE_EVENT_ID'
      );
    });

    it('appends compensating event and immutably marks target event as compensated', async () => {
      const compRes = await appendEvent({
        event_id: 'evt-comp-004',
        match_id: matchId,
        type: 'compensation',
        payload: { compensates: 'evt-score-003', reason: 'Disallowed for offside' },
      });

      assert.equal(compRes.statusCode, 201);
      assert.equal(compRes.data.sequence, 4);

      // Verify projected event stream
      const scoreProj = await getScore(matchId);
      assert.equal(scoreProj.events.length, 4);

      const compensatedEvent = scoreProj.events.find((e) => e.event_id === 'evt-score-003');
      assert.equal(compensatedEvent.compensated, true);
      assert.equal(compensatedEvent.compensated_by, 'evt-comp-004');
    });

    it('rolls back completely if an error occurs during event transaction', async () => {
      const eventsBefore = await db.query('SELECT COUNT(*) FROM match_events WHERE match_id = $1', [matchId]);
      const countBefore = parseInt(eventsBefore.rows[0].count, 10);

      // Attempt invalid transition (e.g. match_start when already in_progress)
      await assert.rejects(
        async () => {
          await appendEvent({
            event_id: 'evt-fail-005',
            match_id: matchId,
            type: 'match_start',
            payload: {},
          });
        },
        (err) => err.statusCode === 409 && err.code === 'ILLEGAL_TRANSITION'
      );

      const eventsAfter = await db.query('SELECT COUNT(*) FROM match_events WHERE match_id = $1', [matchId]);
      assert.equal(parseInt(eventsAfter.rows[0].count, 10), countBefore, 'Failed transaction must leave 0 changes');
    });
  });

  describe('2. Merchandise Checkout Persistence & Concurrency (Section 5.12, NFR-3)', () => {

    it('successfully completes checkout, deducts stock, and generates signed receipt', async () => {
      const orderId = 'ord-test-101';
      const checkoutBody = {
        order_id: orderId,
        customer_id: 'cust-alpha-1',
        items: [{ variant_id: 'var-test-M', quantity: 2 }],
        discount_code: 'WELCOME10',
        payment: { token: 'tok_success' },
      };

      const res = await processCheckout(checkoutBody);

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.order_id, orderId);
      assert.equal(res.data.status, 'paid');
      assert.equal(res.data.subtotal_minor, 900000);
      assert.equal(res.data.discount_minor, 90000); // 10% of 900000
      assert.equal(res.data.total_minor, 810000);

      // Verify stock was decremented from 5 to 3
      const inv = await getInventory('var-test-M');
      assert.equal(inv.stock, 3);

      // Verify receipt signature
      assert.match(res.data.receipt.signature, /^[0-9a-f]{64}$/);
      const isSigValid = verifyReceiptSignature(
        orderId,
        res.data.receipt.payload,
        res.data.receipt.signature
      );
      assert.equal(isSigValid, true, 'Receipt signature must verify with DAY1_SALT');

      // Verify PDF generation
      const pdfBase64 = res.data.receipt.pdf_base64;
      assert.ok(pdfBase64.length > 0);
      const decodedPdf = Buffer.from(pdfBase64, 'base64').toString('utf8');
      assert.ok(decodedPdf.startsWith('%PDF'), 'PDF must start with %PDF header');
      assert.ok(decodedPdf.includes(orderId), 'PDF must include order_id');
      assert.ok(decodedPdf.includes('8100.00'), 'PDF must include formatted major total');
    });

    it('handles idempotent replay of identical checkout returning stored response', async () => {
      const checkoutBody = {
        order_id: 'ord-test-101',
        customer_id: 'cust-alpha-1',
        items: [{ variant_id: 'var-test-M', quantity: 2 }],
        discount_code: 'WELCOME10',
        payment: { token: 'tok_success' },
      };

      const res = await processCheckout(checkoutBody);
      assert.equal(res.statusCode, 200, 'Replay of identical order returns HTTP 200');

      // Stock must NOT be deducted a second time (still 3)
      const inv = await getInventory('var-test-M');
      assert.equal(inv.stock, 3);
    });

    it('rolls back and restores stock when payment is declined (tok_declined)', async () => {
      const stockBefore = (await getInventory('var-test-M')).stock;

      await assert.rejects(
        async () => {
          await processCheckout({
            order_id: 'ord-declined-102',
            customer_id: 'cust-alpha-1',
            items: [{ variant_id: 'var-test-M', quantity: 1 }],
            discount_code: null,
            payment: { token: 'tok_declined' },
          });
        },
        (err) => err.statusCode === 402 && err.code === 'PAYMENT_DECLINED'
      );

      // Stock must be intact
      const stockAfter = (await getInventory('var-test-M')).stock;
      assert.equal(stockAfter, stockBefore, 'Declined transaction must not deduct stock');

      // Order must not be saved in database
      const orderCheck = await db.query('SELECT * FROM orders WHERE order_id = $1', ['ord-declined-102']);
      assert.equal(orderCheck.rows.length, 0);
    });

    it('rejects checkout with 409 OUT_OF_STOCK when quantity exceeds available stock', async () => {
      await assert.rejects(
        async () => {
          await processCheckout({
            order_id: 'ord-excess-103',
            customer_id: 'cust-alpha-1',
            items: [{ variant_id: 'var-test-M', quantity: 999 }], // exceeds remaining stock of 3
            discount_code: null,
            payment: { token: 'tok_success' },
          });
        },
        (err) => err.statusCode === 409 && err.code === 'OUT_OF_STOCK'
      );

      const inv = await getInventory('var-test-M');
      assert.equal(inv.stock, 3, 'Stock must not change when out of stock');
    });

    it('Concurrency test (NFR-3): 10 simultaneous buyers for 1 remaining item yields exactly 1 success', async () => {
      // Set remaining stock to exactly 1
      await db.query("UPDATE product_variants SET stock = 1 WHERE variant_id = 'var-test-M'");

      const buyerCount = 10;
      const checkoutPromises = [];

      for (let i = 0; i < buyerCount; i++) {
        const orderId = `ord-burst-${i}-${Date.now()}`;
        const promise = processCheckout({
          order_id: orderId,
          customer_id: `cust-${i}`,
          items: [{ variant_id: 'var-test-M', quantity: 1 }],
          discount_code: null,
          payment: { token: 'tok_success' },
        })
          .then((res) => ({ status: 'success', res }))
          .catch((err) => ({ status: 'failed', err }));

        checkoutPromises.push(promise);
      }

      // Execute all 10 simultaneously
      const results = await Promise.all(checkoutPromises);

      const successes = results.filter((r) => r.status === 'success');
      const failures = results.filter((r) => r.status === 'failed');

      assert.equal(successes.length, 1, 'Exactly one simultaneous order must succeed');
      assert.equal(failures.length, 9, 'All other concurrent orders must fail');

      for (const f of failures) {
        assert.equal(f.err.statusCode, 409);
        assert.equal(f.err.code, 'OUT_OF_STOCK');
      }

      // Stock must be exactly 0, NEVER negative
      const finalInv = await getInventory('var-test-M');
      assert.equal(finalInv.stock, 0, 'Final stock must be exactly 0, never negative');
    });
  });
});
