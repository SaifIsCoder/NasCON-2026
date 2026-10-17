'use strict';

/**
 * Automated Test Suite for Health Probe (GET /health) and Baseline Reset (POST /audit/v1/reset)
 * Verifies all 12 test requirements from Section 5.4, Section 5.5, and Section 8.3.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');
const { performReset, checkHealth } = require('../src/modules/system/system.service');

describe('System Module: GET /health and POST /audit/v1/reset', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Run migrations and perform initial reset
    await db.migrate();
    await performReset({ seed: 42 });

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

  // Ensure clean baseline before tests that depend on baseline state
  beforeEach(async () => {
    await performReset({ seed: 42 });
  });

  describe('1. GET /health Tests', () => {
    it('1. Healthy database and valid baseline data returns HTTP 200 {"status":"ok"}', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.deepEqual(data, { status: 'ok' });
    });

    it('2. Database unavailable returns HTTP 503 without leaking credentials or internal errors', async () => {
      // Temporarily mock db.query to simulate database outage
      const originalQuery = db.query;
      db.query = async () => {
        throw new Error('FATAL: connection to server at "localhost", port 5432 failed: Connection refused; user="nascon", password="secret_password_123"');
      };

      try {
        const res = await fetch(`${baseUrl}/health`);
        assert.equal(res.status, 503);
        const data = await res.json();

        assert.equal(data.status, 'error');
        assert.equal(data.error.code, 'SERVICE_UNAVAILABLE');
        assert.equal(typeof data.error.message, 'string');

        // Verify security: No passwords, connection strings, or stack traces exposed
        const rawJson = JSON.stringify(data);
        assert.ok(!rawJson.includes('secret_password_123'), 'Must not leak database password');
        assert.ok(!rawJson.includes('nascon'), 'Must not leak database username');
        assert.ok(!rawJson.includes('stack'), 'Must not leak stack traces');
        assert.equal(data.error.details && Object.keys(data.error.details).length, 0);
      } finally {
        db.query = originalQuery;
      }
    });

    it('3. Missing or incomplete baseline data returns HTTP 503', async () => {
      // Temporarily delete one baseline tenant
      await db.query("DELETE FROM tenants WHERE tenant_id = 'tenant-beta'");

      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.error.code, 'SERVICE_UNAVAILABLE');

      // Restoring baseline data restores health
      await performReset({ seed: 42 });
      const resHealthy = await fetch(`${baseUrl}/health`);
      assert.equal(resHealthy.status, 200);
      assert.deepEqual(await resHealthy.json(), { status: 'ok' });
    });
  });

  describe('2. POST /audit/v1/reset Tests', () => {
    it('4. Successful reset with default values (body optional/empty)', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.deepEqual(data, {
        status: 'reset_complete',
        seed: 42,
        sports: ['football', 'basketball', 'cricket', 'esports'],
        tenants: ['tenant-alpha', 'tenant-beta'],
        stock: {
          'var-jersey-001-M': 1,
          'var-jersey-001-L': 5,
        },
      });

      // Verify stock in database
      const varM = await db.query("SELECT stock FROM product_variants WHERE variant_id = 'var-jersey-001-M'");
      const varL = await db.query("SELECT stock FROM product_variants WHERE variant_id = 'var-jersey-001-L'");
      assert.equal(varM.rows[0].stock, 1);
      assert.equal(varL.rows[0].stock, 5);
    });

    it('5. Successful reset with custom seed and stock quantities', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: 1234,
          stock: {
            'var-jersey-001-M': 12,
            'var-jersey-001-L': 40,
          },
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.status, 'reset_complete');
      assert.equal(data.seed, 1234);
      assert.deepEqual(data.stock, {
        'var-jersey-001-M': 12,
        'var-jersey-001-L': 40,
      });

      // Verify database reflects the custom seed and stock
      const seedCheck = await db.query('SELECT seed FROM audit_reset_state WHERE id = 1');
      assert.equal(seedCheck.rows[0].seed, 1234);

      const varM = await db.query("SELECT stock FROM product_variants WHERE variant_id = 'var-jersey-001-M'");
      const varL = await db.query("SELECT stock FROM product_variants WHERE variant_id = 'var-jersey-001-L'");
      assert.equal(varM.rows[0].stock, 12);
      assert.equal(varL.rows[0].stock, 40);
    });

    it('6. Invalid seed returns HTTP 400 VALIDATION_ERROR', async () => {
      // String seed
      const resStr = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 'bad_seed' }),
      });
      assert.equal(resStr.status, 400);
      const dataStr = await resStr.json();
      assert.equal(dataStr.error.code, 'VALIDATION_ERROR');
      assert.ok(dataStr.error.details.fields.includes('seed'));

      // Float seed
      const resFloat = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42.99 }),
      });
      assert.equal(resFloat.status, 400);
      const dataFloat = await resFloat.json();
      assert.equal(dataFloat.error.code, 'VALIDATION_ERROR');
      assert.ok(dataFloat.error.details.fields.includes('seed'));

      // Negative seed
      const resNeg = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: -10 }),
      });
      assert.equal(resNeg.status, 400);
      const dataNeg = await resNeg.json();
      assert.equal(dataNeg.error.code, 'VALIDATION_ERROR');
      assert.ok(dataNeg.error.details.fields.includes('seed'));
    });

    it('7. Invalid stock type returns HTTP 400 VALIDATION_ERROR', async () => {
      // Array instead of object
      const resArr = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: ['var-jersey-001-M', 10] }),
      });
      assert.equal(resArr.status, 400);
      const dataArr = await resArr.json();
      assert.equal(dataArr.error.code, 'VALIDATION_ERROR');
      assert.ok(dataArr.error.details.fields.includes('stock'));

      // String instead of object
      const resStr = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: 'unlimited' }),
      });
      assert.equal(resStr.status, 400);
      const dataStr = await resStr.json();
      assert.equal(dataStr.error.code, 'VALIDATION_ERROR');
      assert.ok(dataStr.error.details.fields.includes('stock'));
    });

    it('8. Negative or non-integer stock quantities return HTTP 400 VALIDATION_ERROR', async () => {
      // Negative quantity
      const resNeg = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: { 'var-jersey-001-M': -3 } }),
      });
      assert.equal(resNeg.status, 400);
      const dataNeg = await resNeg.json();
      assert.equal(dataNeg.error.code, 'VALIDATION_ERROR');
      assert.ok(dataNeg.error.details.fields.includes('stock'));

      // Non-integer float quantity
      const resFloat = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: { 'var-jersey-001-L': 5.5 } }),
      });
      assert.equal(resFloat.status, 400);
      const dataFloat = await resFloat.json();
      assert.equal(dataFloat.error.code, 'VALIDATION_ERROR');
      assert.ok(dataFloat.error.details.fields.includes('stock'));

      // String quantity
      const resStringQty = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: { 'var-jersey-001-L': 'five' } }),
      });
      assert.equal(resStringQty.status, 400);
      const dataStringQty = await resStringQty.json();
      assert.equal(dataStringQty.error.code, 'VALIDATION_ERROR');
      assert.ok(dataStringQty.error.details.fields.includes('stock'));
    });

    it('9. Repeated reset calls produce identical baseline results (idempotency)', async () => {
      const payload = {
        seed: 77,
        stock: {
          'var-jersey-001-M': 3,
          'var-jersey-001-L': 7,
        },
      };

      const res1 = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data1 = await res1.json();

      const res2 = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data2 = await res2.json();

      assert.deepEqual(data1, data2);

      // Verify row counts across all baseline tables
      const tenantsCount = await db.query('SELECT COUNT(*) FROM tenants');
      const sportsCount = await db.query('SELECT COUNT(*) FROM sports');
      const leaguesCount = await db.query('SELECT COUNT(*) FROM leagues');
      const clubsCount = await db.query('SELECT COUNT(*) FROM clubs');
      const playersCount = await db.query('SELECT COUNT(*) FROM players');
      const usersCount = await db.query('SELECT COUNT(*) FROM users');
      const variantsCount = await db.query('SELECT COUNT(*) FROM product_variants');

      assert.equal(parseInt(tenantsCount.rows[0].count, 10), 2);
      assert.equal(parseInt(sportsCount.rows[0].count, 10), 4);
      assert.equal(parseInt(leaguesCount.rows[0].count, 10), 3);
      assert.equal(parseInt(clubsCount.rows[0].count, 10), 3);
      assert.equal(parseInt(playersCount.rows[0].count, 10), 3);
      assert.equal(parseInt(usersCount.rows[0].count, 10), 5);
      assert.equal(parseInt(variantsCount.rows[0].count, 10), 2);
    });

    it('10. Database failure during reset rolls back all changes atomically', async () => {
      // First, create a persistent test marker match
      await db.query(
        `INSERT INTO matches (match_id, sport_id, home_team_id, away_team_id, status)
         VALUES ('m-rollback-canary', 'football', 'team-1', 'team-2', 'upcoming')
         ON CONFLICT (match_id) DO NOTHING`
      );

      // Verify canary match exists
      const beforeCheck = await db.query("SELECT * FROM matches WHERE match_id = 'm-rollback-canary'");
      assert.equal(beforeCheck.rows.length, 1);

      // Intercept client.query to force an error halfway through performReset transaction
      const origGetClient = db.getClient;
      let interceptedClient;
      let origQuery;
      db.getClient = async () => {
        interceptedClient = await origGetClient();
        origQuery = interceptedClient.query;
        interceptedClient.query = (...args) => {
          const text = args[0];
          if (typeof text === 'string' && text.includes('INSERT INTO sports')) {
            return Promise.reject(new Error('Simulated disk I/O error during sports insertion'));
          }
          return origQuery.apply(interceptedClient, args);
        };
        return interceptedClient;
      };

      try {
        await assert.rejects(
          async () => {
            await performReset({ seed: 42 });
          },
          (err) => err.message === 'Simulated disk I/O error during sports insertion'
        );
      } finally {
        if (interceptedClient && origQuery) {
          interceptedClient.query = origQuery;
        }
        db.getClient = origGetClient;
      }

      // Verify the transaction was rolled back and our canary record was NOT deleted
      const afterCheck = await db.query("SELECT * FROM matches WHERE match_id = 'm-rollback-canary'");
      assert.equal(afterCheck.rows.length, 1, 'Transaction rollback must preserve pre-reset data without partial deletes');

      // Clean up canary match
      await db.query("DELETE FROM matches WHERE match_id = 'm-rollback-canary'");
    });

    it('11. Exact response bodies, status codes, and required baseline IDs (Section 5.5, 8.3)', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42 }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();

      // Exact field names and values
      assert.equal(body.status, 'reset_complete');
      assert.equal(body.seed, 42);
      assert.deepEqual(body.sports, ['football', 'basketball', 'cricket', 'esports']);
      assert.deepEqual(body.tenants, ['tenant-alpha', 'tenant-beta']);
      assert.deepEqual(body.stock, {
        'var-jersey-001-M': 1,
        'var-jersey-001-L': 5,
      });

      // Verify exact baseline IDs exist in DB:
      // Tenants
      const t = await db.query('SELECT tenant_id, name FROM tenants ORDER BY tenant_id');
      assert.equal(t.rows[0].tenant_id, 'tenant-alpha');
      assert.equal(t.rows[1].tenant_id, 'tenant-beta');

      // Product & Variants
      const p = await db.query("SELECT * FROM products WHERE product_id = 'prod-jersey-001'");
      assert.equal(p.rows.length, 1);
      assert.equal(p.rows[0].tenant_id, 'tenant-alpha');

      const vM = await db.query("SELECT * FROM product_variants WHERE variant_id = 'var-jersey-001-M'");
      assert.equal(vM.rows[0].price_minor, 450000);
      assert.equal(vM.rows[0].currency, 'PKR');

      const vL = await db.query("SELECT * FROM product_variants WHERE variant_id = 'var-jersey-001-L'");
      assert.equal(vL.rows[0].price_minor, 450000);
      assert.equal(vL.rows[0].currency, 'PKR');

      // Discount
      const d = await db.query("SELECT * FROM discounts WHERE code = 'WELCOME10'");
      assert.equal(d.rows.length, 1);
      assert.equal(d.rows[0].percent, 10);

      // Leagues
      const l = await db.query('SELECT league_id, tenant_id FROM leagues ORDER BY league_id');
      assert.deepEqual(l.rows.map((r) => r.league_id), ['league-alpha-1', 'league-alpha-2', 'league-beta-1']);

      // Clubs
      const c = await db.query('SELECT club_id, tenant_id FROM clubs ORDER BY club_id');
      assert.deepEqual(c.rows.map((r) => r.club_id), ['club-alpha-1', 'club-alpha-2', 'club-beta-1']);

      // Players
      const pl = await db.query('SELECT player_id, club_id FROM players ORDER BY player_id');
      assert.deepEqual(pl.rows.map((r) => r.player_id), ['player-alpha-1', 'player-alpha-2', 'player-beta-1']);

      // 5 Demo Users (Section 8.3)
      const u = await db.query('SELECT email, role FROM users ORDER BY email');
      const emails = u.rows.map((r) => r.email);
      assert.ok(emails.includes('admin@nascon.test'));
      assert.ok(emails.includes('organizer@nascon.test'));
      assert.ok(emails.includes('manager@nascon.test'));
      assert.ok(emails.includes('player@nascon.test'));
      assert.ok(emails.includes('viewer@nascon.test'));
    });

    it('12. No unintended deletion of migration or schema records', async () => {
      // Ensure migration record exists
      const beforeMigrations = await db.query('SELECT * FROM schema_migrations');
      assert.ok(beforeMigrations.rows.length >= 1, 'schema_migrations must have records');
      const beforeCount = beforeMigrations.rows.length;

      // Perform reset
      await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42 }),
      });

      // Migration history must be completely untouched
      const afterMigrations = await db.query('SELECT * FROM schema_migrations');
      assert.equal(afterMigrations.rows.length, beforeCount, 'Reset must never delete migration records');

      // All tables must still exist
      const tables = await db.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name IN ('matches', 'match_events', 'products', 'product_variants', 'orders', 'tenants', 'sports', 'leagues', 'clubs', 'players', 'users', 'discounts', 'schema_migrations')`
      );
      assert.equal(tables.rows.length, 13, 'All schema tables must remain intact');
    });
  });
});
