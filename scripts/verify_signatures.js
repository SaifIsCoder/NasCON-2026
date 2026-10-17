'use strict';

/**
 * End-to-End Verification Script for NaSCon '26 Signatures & PostgreSQL Persistence
 * - Starts the Express HTTP server
 * - Sends actual HTTP POST requests for events and checkout
 * - Queries PostgreSQL to inspect persisted rows
 * - Independently recomputes signatures from scratch using raw crypto module
 * - Tests tamper rejection and the official Appendix A demo-salt test vector
 */

const http = require('http');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/db');
const { canonicalize, getDay1Salt, verifyEventSignature, verifyReceiptSignature } = require('../src/utils/signature');

async function runVerification() {
  console.log('================================================================');
  console.log('NaSCon ’26 Live Verification of HTTP Endpoints & Signatures');
  console.log('================================================================');

  // 1. Ensure migrations and seed fixture product
  await db.migrate();
  await db.query("INSERT INTO products (product_id, tenant_id, name) VALUES ('prod-verify-01', 'tenant-alpha', 'Verify Jersey') ON CONFLICT DO NOTHING");
  await db.query(
    `INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved)
     VALUES ('var-verify-M', 'prod-verify-01', 'Verify Jersey M', 450000, 'PKR', 20, 0)
     ON CONFLICT (variant_id) DO UPDATE SET stock = 20`
  );

  // 2. Start HTTP server on port 8080 (or fallback if occupied)
  const server = http.createServer(app);
  const port = await new Promise((resolve) => {
    server.listen(8080, '127.0.0.1', () => resolve(8080));
    server.on('error', () => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[HTTP Server] Listening on ${baseUrl}`);

  try {
    const activeSalt = getDay1Salt();
    console.log(`[Salt Check] DAY1_SALT loaded successfully (length: ${activeSalt.length} chars, masked: ${activeSalt[0]}***${activeSalt.slice(-1)})`);

    // =========================================================================
    // A. TEST OFFICIAL DEMO-SALT TEST VECTOR (Appendix A)
    // =========================================================================
    console.log('\n--- Step A: Verifying Official Test Vector 1 (Appendix A) ---');
    const demoSalt = 'demo-salt';
    const demoId = 'evt-1';
    const demoPayload = { team_id: 't1', event_type: 'goal' };
    const demoCanonical = canonicalize(demoPayload);
    const demoExpectedSig = '972a8b558690b19121cc5bea84978f85e8eb15a3735018db36616bab1d7ec501';

    const demoHmac = crypto.createHmac('sha256', Buffer.from(demoSalt, 'utf8'));
    demoHmac.update(Buffer.from(`${demoId}|${demoCanonical}`, 'utf8'));
    const demoComputedSig = demoHmac.digest('hex').toLowerCase();

    console.log(`  Canonical JSON : ${demoCanonical}`);
    console.log(`  Computed Sig   : ${demoComputedSig}`);
    console.log(`  Expected Sig   : ${demoExpectedSig}`);
    if (demoComputedSig !== demoExpectedSig) {
      throw new Error(`Test vector mismatch! Got ${demoComputedSig}, expected ${demoExpectedSig}`);
    }
    console.log('  [PASS] Official Test Vector matches 100% exactly.');

    // =========================================================================
    // B. SEND LIVE HTTP REQUEST: SCORE EVENT (POST /audit/v1/events)
    // =========================================================================
    console.log('\n--- Step B: Live HTTP Request: Match Events (POST /audit/v1/events) ---');
    const testMatchId = `m-live-${Date.now()}`;
    const initEventId = `evt-init-${Date.now()}`;
    const scoreEventId = `evt-score-${Date.now()}`;

    // 1. Initialize match
    const initRes = await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: initEventId,
        match_id: testMatchId,
        type: 'match_init',
        payload: { sport_id: 'football', home_team_id: 'alpha-fc', away_team_id: 'beta-fc' },
      }),
    });
    console.log(`  POST match_init status: ${initRes.status}`);
    const initData = await initRes.json();
    console.log(`  match_init response signature: ${initData.signature}`);

    // 2. Start match
    await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: `evt-start-${Date.now()}`,
        match_id: testMatchId,
        type: 'match_start',
        payload: {},
      }),
    });

    // 3. Score event
    const eventPayload = { team_id: 'alpha-fc', event_type: 'goal' };
    const scoreRes = await fetch(`${baseUrl}/audit/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: scoreEventId,
        match_id: testMatchId,
        type: 'score',
        payload: eventPayload,
      }),
    });

    console.log(`  POST score event status: ${scoreRes.status}`);
    const scoreData = await scoreRes.json();
    console.log(`  HTTP Response signature: ${scoreData.signature}`);

    // =========================================================================
    // C. QUERY POSTGRESQL & INDEPENDENTLY RECOMPUTE EVENT SIGNATURE
    // =========================================================================
    console.log('\n--- Step C: Query PostgreSQL for Match Event & Recompute Signature ---');
    const dbEventRes = await db.query('SELECT * FROM match_events WHERE event_id = $1', [scoreEventId]);
    if (dbEventRes.rows.length === 0) {
      throw new Error(`Event ${scoreEventId} was not found in PostgreSQL!`);
    }

    const dbEvent = dbEventRes.rows[0];
    console.log(`  PostgreSQL event_id : ${dbEvent.event_id}`);
    console.log(`  PostgreSQL sequence : ${dbEvent.sequence}`);
    console.log(`  PostgreSQL stored signature: ${dbEvent.signature}`);

    // Validate signature format
    if (!/^[0-9a-f]{64}$/.test(dbEvent.signature)) {
      throw new Error(`Stored event signature is not 64 lowercase hex chars! Got: ${dbEvent.signature}`);
    }

    // Independently recompute from raw crypto
    const rawEventCanon = canonicalize(dbEvent.payload);
    const rawEventMsg = `${dbEvent.event_id}|${rawEventCanon}`;
    const rawEventHmac = crypto.createHmac('sha256', Buffer.from(activeSalt, 'utf8'));
    rawEventHmac.update(Buffer.from(rawEventMsg, 'utf8'));
    const independentEventSig = rawEventHmac.digest('hex').toLowerCase();

    console.log(`  Independently recomputed signature: ${independentEventSig}`);
    if (independentEventSig !== dbEvent.signature) {
      throw new Error(`Independent signature recomputation mismatch!`);
    }
    console.log('  [PASS] Stored event signature matches independent recomputation 100%.');

    // =========================================================================
    // D. SEND LIVE HTTP REQUEST: CHECKOUT (POST /audit/v1/checkout)
    // =========================================================================
    console.log('\n--- Step D: Live HTTP Request: Checkout (POST /audit/v1/checkout) ---');
    const testOrderId = `ord-live-${Date.now()}`;
    const checkoutRes = await fetch(`${baseUrl}/audit/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: testOrderId,
        customer_id: 'cust-live-001',
        items: [{ variant_id: 'var-verify-M', quantity: 1 }],
        discount_code: 'WELCOME10',
        payment: { token: 'tok_success' },
      }),
    });

    console.log(`  POST checkout status: ${checkoutRes.status}`);
    const checkoutData = await checkoutRes.json();
    console.log(`  Order status: ${checkoutData.status}, Total: PKR ${checkoutData.total_minor / 100}`);
    console.log(`  Receipt signature: ${checkoutData.receipt.signature}`);

    // =========================================================================
    // E. QUERY POSTGRESQL & INDEPENDENTLY RECOMPUTE RECEIPT SIGNATURE
    // =========================================================================
    console.log('\n--- Step E: Query PostgreSQL for Order & Recompute Receipt Signature ---');
    const dbOrderRes = await db.query('SELECT * FROM orders WHERE order_id = $1', [testOrderId]);
    if (dbOrderRes.rows.length === 0) {
      throw new Error(`Order ${testOrderId} was not found in PostgreSQL!`);
    }

    const dbOrder = dbOrderRes.rows[0];
    console.log(`  PostgreSQL order_id : ${dbOrder.order_id}`);
    console.log(`  PostgreSQL stored receipt_signature: ${dbOrder.receipt_signature}`);

    // Validate signature format
    if (!/^[0-9a-f]{64}$/.test(dbOrder.receipt_signature)) {
      throw new Error(`Stored receipt signature is not 64 lowercase hex chars! Got: ${dbOrder.receipt_signature}`);
    }

    // Independently recompute receipt signature from raw crypto
    const rawReceiptCanon = canonicalize(dbOrder.receipt_payload);
    const rawReceiptMsg = `${dbOrder.order_id}|${rawReceiptCanon}`;
    const rawReceiptHmac = crypto.createHmac('sha256', Buffer.from(activeSalt, 'utf8'));
    rawReceiptHmac.update(Buffer.from(rawReceiptMsg, 'utf8'));
    const independentReceiptSig = rawReceiptHmac.digest('hex').toLowerCase();

    console.log(`  Independently recomputed receipt signature: ${independentReceiptSig}`);
    if (independentReceiptSig !== dbOrder.receipt_signature) {
      throw new Error(`Independent receipt signature recomputation mismatch!`);
    }
    console.log('  [PASS] Stored receipt signature matches independent recomputation 100%.');

    // =========================================================================
    // F. TEST TAMPER REJECTION
    // =========================================================================
    console.log('\n--- Step F: Testing Tamper Rejection ---');
    // 1. Tamper payload field
    const tamperedPayload = { ...eventPayload, event_type: 'foul' };
    const isTamperedPayloadValid = verifyEventSignature(scoreEventId, tamperedPayload, dbEvent.signature);
    console.log(`  Altered payload verification result (expected false): ${isTamperedPayloadValid}`);
    if (isTamperedPayloadValid !== false) {
      throw new Error('Verification failed to reject altered payload!');
    }

    // 2. Tamper signature byte
    const forgedSignature = dbEvent.signature.slice(0, 63) + (dbEvent.signature[63] === 'a' ? 'b' : 'a');
    const isForgedSigValid = verifyEventSignature(scoreEventId, eventPayload, forgedSignature);
    console.log(`  Altered signature verification result (expected false): ${isForgedSigValid}`);
    if (isForgedSigValid !== false) {
      throw new Error('Verification failed to reject forged signature!');
    }
    console.log('  [PASS] Both payload tampering and signature forging are strictly rejected.');

    console.log('\n================================================================');
    console.log('ALL VERIFICATION CHECKS PASSED WITH 100% INTEGRITY');
    console.log('================================================================');
  } finally {
    server.close();
    await db.close();
  }
}

runVerification().catch((err) => {
  console.error('\n[VERIFICATION ERROR]', err);
  process.exit(1);
});
