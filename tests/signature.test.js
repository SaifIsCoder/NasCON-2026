'use strict';

/**
 * Automated Test Suite for NaSCon '26 Signature System (Node.js)
 * Tests canonical JSON serialization, HMAC-SHA256 signing, Appendix A test vectors,
 * and integration workflows for score events and checkout receipts.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  canonicalize,
  compareCodePoints,
  signPayload,
  signEvent,
  signReceipt,
  verifySignature,
  verifyEventSignature,
  verifyReceiptSignature,
} = require('../src/utils/signature.js');

const backendModule = require('../backend/src/utils/signature.js');

describe('NaSCon 26 Signature System', () => {

  describe('Official Test Vector (Appendix A & Section 5.3)', () => {
    it('matches official Test Vector 1 canonical JSON and signature exactly', () => {
      const salt = 'demo-salt';
      const id = 'evt-1';
      const payload = { team_id: 't1', event_type: 'goal' };

      const canonical = canonicalize(payload);
      assert.equal(canonical, '{"event_type":"goal","team_id":"t1"}');

      const signature = signPayload(salt, id, payload);
      const expectedSignature = '972a8b558690b19121cc5bea84978f85e8eb15a3735018db36616bab1d7ec501';

      assert.equal(signature, expectedSignature);
      assert.equal(signature.length, 64);
      assert.match(signature, /^[0-9a-f]{64}$/);

      // Verify the signature helper validates this correctly
      assert.equal(verifySignature(salt, id, payload, signature), true);
    });
  });

  describe('Canonical JSON Properties', () => {
    it('produces identical canonical JSON and signature regardless of key insertion order', () => {
      const salt = 'test-salt-alpha';
      const id = 'evt-order-test';

      const obj1 = { z: 1, a: 2, m: { nested_b: true, nested_a: false } };
      const obj2 = { a: 2, m: { nested_a: false, nested_b: true }, z: 1 };

      const canon1 = canonicalize(obj1);
      const canon2 = canonicalize(obj2);

      assert.equal(canon1, '{"a":2,"m":{"nested_a":false,"nested_b":true},"z":1}');
      assert.equal(canon1, canon2);

      const sig1 = signPayload(salt, id, obj1);
      const sig2 = signPayload(salt, id, obj2);
      assert.equal(sig1, sig2);
    });

    it('treats JSON string input with differing whitespace identically when parsed', () => {
      const salt = 'test-salt-whitespace';
      const id = 'evt-ws';

      const jsonWithSpaces = '{\n  "team_id":   "t1", \n  "event_type":  "goal" \n}';
      const compactObj = { team_id: 't1', event_type: 'goal' };

      const canonStr = canonicalize(jsonWithSpaces);
      const canonObj = canonicalize(compactObj);

      assert.equal(canonStr, canonObj);
      assert.equal(signPayload(salt, id, jsonWithSpaces), signPayload(salt, id, compactObj));
    });

    it('preserves array element order without sorting them', () => {
      const payload = { items: [3, 1, 4, 2], names: ['Charlie', 'Alice', 'Bob'] };
      const canon = canonicalize(payload);
      assert.equal(canon, '{"items":[3,1,4,2],"names":["Charlie","Alice","Bob"]}');
    });

    it('encodes non-ASCII Unicode characters directly as UTF-8 without \\u escapes', () => {
      const salt = 'unicode-salt';
      const id = 'evt-unicode';
      const payload = { sport: 'کرکٹ', venue: 'اسلام آباد', notes: 'NaSCon ’26 Final — Match' };

      const canon = canonicalize(payload);
      assert.ok(canon.includes('کرکٹ'), 'Should contain raw Unicode characters');
      assert.ok(!canon.includes('\\u'), 'Should not contain \\u escape sequences');

      const sig = signPayload(salt, id, payload);
      assert.match(sig, /^[0-9a-f]{64}$/);
      assert.equal(verifySignature(salt, id, payload, sig), true);
    });

    it('formats numbers and booleans correctly', () => {
      const payload = { count: 450000, active: true, disabled: false, rating: null };
      const canon = canonicalize(payload);
      assert.equal(canon, '{"active":true,"count":450000,"disabled":false,"rating":null}');
    });
  });

  describe('Cryptographic Signature Properties', () => {
    it('produces different signatures for different IDs with the same payload', () => {
      const salt = 'demo-salt';
      const payload = { team_id: 't1', event_type: 'goal' };

      const sig1 = signPayload(salt, 'evt-1', payload);
      const sig2 = signPayload(salt, 'evt-2', payload);

      assert.notEqual(sig1, sig2);
    });

    it('produces different signatures for different payloads with the same ID', () => {
      const salt = 'demo-salt';
      const id = 'evt-1';

      const sig1 = signPayload(salt, id, { team_id: 't1', event_type: 'goal' });
      const sig2 = signPayload(salt, id, { team_id: 't2', event_type: 'goal' });

      assert.notEqual(sig1, sig2);
    });

    it('fails safely and throws error when DAY1_SALT is missing', () => {
      const originalSalt = process.env.DAY1_SALT;
      try {
        delete process.env.DAY1_SALT;

        // Directly with signPayload
        assert.throws(() => {
          signPayload('', 'evt-1', { test: true });
        }, /Salt must be a non-empty string/);

        // With signEvent without salt override and without DAY1_SALT in env
        // Temporarily ensure no .env file lookup interferes
        const originalEnv = process.env.DAY1_SALT;
        assert.throws(() => {
          // Empty string salt override
          signEvent('evt-1', { test: true }, '');
        });
      } finally {
        if (originalSalt !== undefined) {
          process.env.DAY1_SALT = originalSalt;
        }
      }
    });

    it('fails when ID is empty or invalid', () => {
      assert.throws(() => {
        signPayload('demo-salt', '', { test: true });
      }, /Record ID must be a non-empty string/);
    });

    it('always outputs exactly 64 lowercase hexadecimal characters', () => {
      const salt = 'test-salt-length';
      const cases = [
        { id: '1', payload: {} },
        { id: '2', payload: { a: 'b' } },
        { id: '3', payload: [1, 2, 3] },
        { id: '4', payload: 'simple string' }
      ];

      for (const c of cases) {
        const sig = signPayload(salt, c.id, c.payload);
        assert.equal(sig.length, 64);
        assert.equal(sig, sig.toLowerCase());
        assert.match(sig, /^[0-9a-f]{64}$/);
      }
    });
  });

  describe('Workflow Integration: Score Events (Section 5.9)', () => {
    it('signs score events with exact contract fields and verifies correctly', () => {
      const testSalt = 'sprint-event-salt-987';
      const eventRecord = {
        event_id: 'evt-0003',
        match_id: 'm1',
        type: 'score',
        payload: { team_id: 't1', event_type: 'goal' },
      };

      // Sign the event payload with event_id
      const signature = signEvent(eventRecord.event_id, eventRecord.payload, testSalt);

      assert.match(signature, /^[0-9a-f]{64}$/);

      // Full event response object per Section 5.9
      const eventResponse = {
        event_id: eventRecord.event_id,
        match_id: eventRecord.match_id,
        type: eventRecord.type,
        sequence: 3,
        match_version: 3,
        signature: signature,
      };

      assert.equal(eventResponse.signature, signature);

      // Verify signature is valid
      const isValid = verifyEventSignature(
        eventRecord.event_id,
        eventRecord.payload,
        eventResponse.signature,
        testSalt
      );
      assert.equal(isValid, true);
    });

    it('signs compensating events following the exact append-only protocol', () => {
      const testSalt = 'sprint-event-salt-987';
      const compensatingEvent = {
        event_id: 'evt-0004',
        match_id: 'm1',
        type: 'compensation',
        payload: { compensates: 'evt-0003', reason: 'Handball after VAR review' },
      };

      const signature = signEvent(compensatingEvent.event_id, compensatingEvent.payload, testSalt);
      assert.match(signature, /^[0-9a-f]{64}$/);

      const isValid = verifyEventSignature(
        compensatingEvent.event_id,
        compensatingEvent.payload,
        signature,
        testSalt
      );
      assert.equal(isValid, true);
    });
  });

  describe('Workflow Integration: Checkout Receipts (Section 5.12)', () => {
    it('signs checkout receipt payload with order_id and verifies correctly', () => {
      const testSalt = 'store-receipt-salt-456';
      const orderId = 'ord-001';

      // Receipt payload structure per Section 5.12
      const receiptPayload = {
        order_id: orderId,
        customer_id: 'cust-001',
        items: [{ variant_id: 'var-jersey-001-M', quantity: 1, unit_price_minor: 450000 }],
        subtotal_minor: 450000,
        discount_minor: 0,
        total_minor: 450000,
        currency: 'PKR',
        paid_at: '2026-10-17T11:20:05Z',
      };

      const signature = signReceipt(orderId, receiptPayload, testSalt);

      assert.match(signature, /^[0-9a-f]{64}$/);

      // Verify the signature
      const isValid = verifyReceiptSignature(orderId, receiptPayload, signature, testSalt);
      assert.equal(isValid, true);

      // Replay check: identical payload and orderId produces identical signature
      const replaySignature = signReceipt(orderId, receiptPayload, testSalt);
      assert.equal(replaySignature, signature);
    });

    it('rejects tampered checkout receipt payloads', () => {
      const testSalt = 'store-receipt-salt-456';
      const orderId = 'ord-001';

      const originalPayload = {
        order_id: orderId,
        customer_id: 'cust-001',
        total_minor: 450000,
        currency: 'PKR',
      };

      const signature = signReceipt(orderId, originalPayload, testSalt);

      // Tampered total
      const tamperedPayload = {
        order_id: orderId,
        customer_id: 'cust-001',
        total_minor: 400000, // modified total
        currency: 'PKR',
      };

      const isValid = verifyReceiptSignature(orderId, tamperedPayload, signature, testSalt);
      assert.equal(isValid, false, 'Tampered payload must fail signature verification');
    });

    it('rejects tampered or forged signatures', () => {
      const testSalt = 'store-receipt-salt-456';
      const orderId = 'ord-001';
      const payload = { order_id: orderId, total_minor: 450000 };

      const validSig = signReceipt(orderId, payload, testSalt);

      // Alter single character
      const forgedSig = validSig.slice(0, 63) + (validSig[63] === '0' ? '1' : '0');

      assert.equal(verifyReceiptSignature(orderId, payload, forgedSig, testSalt), false);
      assert.equal(verifyReceiptSignature(orderId, payload, 'invalid-length-sig', testSalt), false);
      assert.equal(verifyReceiptSignature(orderId, payload, null, testSalt), false);
    });
  });

  describe('Module Path Re-Export Compatibility', () => {
    it('backend/src/utils/signature.js re-exports identical functions', () => {
      assert.equal(backendModule.canonicalize, canonicalize);
      assert.equal(backendModule.signPayload, signPayload);
      assert.equal(backendModule.signEvent, signEvent);
      assert.equal(backendModule.signReceipt, signReceipt);
      assert.equal(backendModule.verifySignature, verifySignature);
    });
  });
});
