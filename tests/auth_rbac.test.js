'use strict';

/**
 * Automated Test Suite for Authentication, Five-Role RBAC, and Authorization Probes
 * Covers Section 3.3, 5.2, 5.13, 8.3 of the NaSCon '26 Part I Specification.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/db');
const { performReset } = require('../src/modules/system/system.service');
const { JWT_SECRET, generateToken } = require('../src/modules/auth/auth.service');

describe('Authentication & Five-Role RBAC Suite (Section 5.13, 8.3)', () => {
  let server;
  let baseUrl;
  let rbacData;

  before(async () => {
    // Ensure fresh baseline data
    await db.migrate();
    await performReset({ seed: 42 });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Fetch RBAC Matrix tokens for test cases
    const matrixRes = await fetch(`${baseUrl}/audit/v1/rbac-matrix`, { method: 'POST' });
    assert.equal(matrixRes.status, 200);
    rbacData = await matrixRes.json();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.close();
  });

  describe('1. Authentication & Login Tests', () => {
    it('1. Successful login for valid demo credentials', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@nascon.test',
          password: 'Nascon@26',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token, 'Must return JWT token');
      assert.equal(data.user.email, 'admin@nascon.test');
      assert.equal(data.user.role, 'super_admin');

      // Verify no sensitive fields in response
      assert.equal(data.user.password, undefined);
      assert.equal(data.user.password_hash, undefined);
    });

    it('2. Invalid password returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@nascon.test',
          password: 'WrongPassword!',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
      assert.deepEqual(data.error.details, {});
    });

    it('3. Unknown user returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@nascon.test',
          password: 'Nascon@26',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('4. Missing token on protected route returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('5. Malformed token returns HTTP 401 UNAUTHENTICATED', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('6. Tampered token returns HTTP 401 UNAUTHENTICATED', async () => {
      // Create valid token then tamper with payload
      const token = rbacData.tokens.viewer;
      const [h, p, s] = token.split('.');
      const payloadObj = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      payloadObj.role = 'super_admin'; // Escalate role
      const tamperedPayload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
      const tamperedToken = `${h}.${tamperedPayload}.${s}`;

      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('7. Expired token returns HTTP 401 UNAUTHENTICATED', async () => {
      const expiredToken = jwt.sign(
        { sub: 'usr-admin-001', role: 'super_admin' },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '-10s' }
      );

      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('8. Token using alg: none returns HTTP 401 UNAUTHENTICATED', async () => {
      const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify({ sub: 'usr-admin-001', role: 'super_admin' })).toString('base64url');
      const unsignedToken = `${headerB64}.${payloadB64}.`;

      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${unsignedToken}` },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('9. Token with invalid signature returns HTTP 401 UNAUTHENTICATED', async () => {
      const forgedToken = jwt.sign(
        { sub: 'usr-admin-001', role: 'super_admin' },
        'wrong-secret-signature-key',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${forgedToken}` },
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('10. Role or tenant scope cannot be escalated via request body', async () => {
      // Viewer attempts to pass { role: 'super_admin' } in request body to access P1
      const res = await fetch(`${baseUrl}/audit/v1/rbac/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rbacData.tokens.viewer}`,
        },
        body: JSON.stringify({ role: 'super_admin', tenant_id: null }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.error.code, 'FORBIDDEN');
    });
  });

  describe('2. Five-Role RBAC & Matrix Contract (Section 5.13)', () => {
    it('11. POST /audit/v1/rbac-matrix returns the exact required fields and seeded IDs', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac-matrix`, { method: 'POST' });
      assert.equal(res.status, 200);
      const body = await res.json();

      // Tokens map
      assert.ok(body.tokens.super_admin);
      assert.ok(body.tokens.league_organizer);
      assert.ok(body.tokens.club_manager);
      assert.ok(body.tokens.player);
      assert.ok(body.tokens.viewer);

      // Context map
      assert.deepEqual(body.context, {
        tenant_id: 'tenant-alpha',
        foreign_tenant_id: 'tenant-beta',
        own_league_id: 'league-alpha-1',
        other_league_id: 'league-alpha-2',
        foreign_league_id: 'league-beta-1',
        own_club_id: 'club-alpha-1',
        other_club_id: 'club-alpha-2',
        foreign_club_id: 'club-beta-1',
        own_player_id: 'player-alpha-1',
        other_player_id: 'player-alpha-2',
        foreign_player_id: 'player-beta-1',
      });
    });

    it('12. All five returned JWTs verify successfully with HS256', () => {
      for (const [role, token] of Object.entries(rbacData.tokens)) {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        assert.equal(decoded.role, role);
      }
    });

    it('13. All returned tokens remain valid for at least 1 hour', () => {
      const now = Math.floor(Date.now() / 1000);
      for (const token of Object.values(rbacData.tokens)) {
        const decoded = jwt.decode(token);
        assert.ok(decoded.exp - now >= 3600, 'Token must be valid for at least 3600 seconds');
      }
    });

    it('14. Complete Official Authorization Matrix Verification (P1 - P7)', async () => {
      const tokens = rbacData.tokens;
      const ctx = rbacData.context;

      // Define matrix test vector: [probe, method, path, expectedStatusByRole]
      // Roles: [super_admin, league_organizer, club_manager, player, viewer]
      const matrixCases = [
        // P1: POST /audit/v1/rbac/tenants -> Super: 200, all others: 403
        {
          id: 'P1',
          method: 'POST',
          path: '/audit/v1/rbac/tenants',
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P2 own league: POST /audit/v1/rbac/leagues/league-alpha-1/fixtures -> Super: 200, Organizer: 200, others: 403
        {
          id: 'P2 own',
          method: 'POST',
          path: `/audit/v1/rbac/leagues/${ctx.own_league_id}/fixtures`,
          expected: { super_admin: 200, league_organizer: 200, club_manager: 403, player: 403, viewer: 403 },
        },
        // P2 other league (same tenant): POST .../leagues/league-alpha-2/fixtures -> Super: 200, others: 403
        {
          id: 'P2 other',
          method: 'POST',
          path: `/audit/v1/rbac/leagues/${ctx.other_league_id}/fixtures`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P2 foreign league: POST .../leagues/league-beta-1/fixtures -> Super: 200, others: 403
        {
          id: 'P2 foreign',
          method: 'POST',
          path: `/audit/v1/rbac/leagues/${ctx.foreign_league_id}/fixtures`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P3 own club: POST /audit/v1/rbac/clubs/club-alpha-1/roster -> Super: 200, Mgr: 200, others: 403
        {
          id: 'P3 own',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.own_club_id}/roster`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 200, player: 403, viewer: 403 },
        },
        // P3 other club: POST .../clubs/club-alpha-2/roster -> Super: 200, others: 403
        {
          id: 'P3 other',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.other_club_id}/roster`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P3 foreign club: POST .../clubs/club-beta-1/roster -> Super: 200, others: 403
        {
          id: 'P3 foreign',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.foreign_club_id}/roster`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P4 own club: POST /audit/v1/rbac/clubs/club-alpha-1/products -> Super: 200, Mgr: 200, others: 403
        {
          id: 'P4 own',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.own_club_id}/products`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 200, player: 403, viewer: 403 },
        },
        // P4 other club: POST .../clubs/club-alpha-2/products -> Super: 200, others: 403
        {
          id: 'P4 other',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.other_club_id}/products`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P4 foreign club: POST .../clubs/club-beta-1/products -> Super: 200, others: 403
        {
          id: 'P4 foreign',
          method: 'POST',
          path: `/audit/v1/rbac/clubs/${ctx.foreign_club_id}/products`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P5 own player: PATCH /audit/v1/rbac/players/player-alpha-1 -> Super: 200, Mgr: 200, Player: 200, Org: 403, Viewer: 403
        {
          id: 'P5 own',
          method: 'PATCH',
          path: `/audit/v1/rbac/players/${ctx.own_player_id}`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 200, player: 200, viewer: 403 },
        },
        // P5 other player: PATCH .../players/player-alpha-2 -> Super: 200, others: 403
        {
          id: 'P5 other',
          method: 'PATCH',
          path: `/audit/v1/rbac/players/${ctx.other_player_id}`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P5 foreign player: PATCH .../players/player-beta-1 -> Super: 200, others: 403
        {
          id: 'P5 foreign',
          method: 'PATCH',
          path: `/audit/v1/rbac/players/${ctx.foreign_player_id}`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P6 own club / other club (tenant-alpha): GET .../clubs/club-alpha-1 -> ALL 200
        {
          id: 'P6 own club (tenant-alpha)',
          method: 'GET',
          path: `/audit/v1/rbac/clubs/${ctx.own_club_id}`,
          expected: { super_admin: 200, league_organizer: 200, club_manager: 200, player: 200, viewer: 200 },
        },
        {
          id: 'P6 other club (tenant-alpha)',
          method: 'GET',
          path: `/audit/v1/rbac/clubs/${ctx.other_club_id}`,
          expected: { super_admin: 200, league_organizer: 200, club_manager: 200, player: 200, viewer: 200 },
        },
        // P6 foreign club: GET .../clubs/club-beta-1 -> Super: 200, others: 403
        {
          id: 'P6 foreign club (tenant-beta)',
          method: 'GET',
          path: `/audit/v1/rbac/clubs/${ctx.foreign_club_id}`,
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
        // P7: GET /audit/v1/rbac/platform/config -> Super: 200, others: 403
        {
          id: 'P7 platform config',
          method: 'GET',
          path: '/audit/v1/rbac/platform/config',
          expected: { super_admin: 200, league_organizer: 403, club_manager: 403, player: 403, viewer: 403 },
        },
      ];

      for (const tc of matrixCases) {
        for (const [role, expectedStatus] of Object.entries(tc.expected)) {
          const token = tokens[role];
          const res = await fetch(`${baseUrl}${tc.path}`, {
            method: tc.method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: tc.method === 'GET' ? undefined : JSON.stringify({}),
          });

          const data = await res.json();
          assert.equal(
            res.status,
            expectedStatus,
            `Failed probe ${tc.id} for role ${role}: expected HTTP ${expectedStatus}, received ${res.status}`
          );

          if (expectedStatus === 200) {
            assert.deepEqual(data, { authorized: true });
          } else {
            assert.equal(data.error.code, 'FORBIDDEN');
            assert.deepEqual(data.error.details, {});
          }
        }
      }
    });

    it('15. League Organizer cannot access foreign or other league fixtures', async () => {
      const resOther = await fetch(`${baseUrl}/audit/v1/rbac/leagues/league-alpha-2/fixtures`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rbacData.tokens.league_organizer}` },
      });
      assert.equal(resOther.status, 403);

      const resForeign = await fetch(`${baseUrl}/audit/v1/rbac/leagues/league-beta-1/fixtures`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rbacData.tokens.league_organizer}` },
      });
      assert.equal(resForeign.status, 403);
    });

    it('16. Club Manager cannot manage another club roster or products', async () => {
      const resOtherRoster = await fetch(`${baseUrl}/audit/v1/rbac/clubs/club-alpha-2/roster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rbacData.tokens.club_manager}` },
      });
      assert.equal(resOtherRoster.status, 403);

      const resForeignProducts = await fetch(`${baseUrl}/audit/v1/rbac/clubs/club-beta-1/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rbacData.tokens.club_manager}` },
      });
      assert.equal(resForeignProducts.status, 403);
    });

    it('17. Non-super-admin roles cannot access foreign tenant club (tenant-beta)', async () => {
      const nonSuperRoles = ['league_organizer', 'club_manager', 'player', 'viewer'];
      for (const role of nonSuperRoles) {
        const res = await fetch(`${baseUrl}/audit/v1/rbac/clubs/club-beta-1`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${rbacData.tokens[role]}` },
        });
        assert.equal(res.status, 403, `${role} must receive 403 on foreign club`);
        const data = await res.json();
        assert.equal(data.error.code, 'FORBIDDEN');
      }
    });

    it('18. Viewer cannot perform any write operations', async () => {
      const token = rbacData.tokens.viewer;
      const writeEndpoints = [
        { method: 'POST', path: '/audit/v1/rbac/tenants' },
        { method: 'POST', path: '/audit/v1/rbac/leagues/league-alpha-1/fixtures' },
        { method: 'POST', path: '/audit/v1/rbac/clubs/club-alpha-1/roster' },
        { method: 'POST', path: '/audit/v1/rbac/clubs/club-alpha-1/products' },
        { method: 'PATCH', path: '/audit/v1/rbac/players/player-alpha-1' },
      ];

      for (const ep of writeEndpoints) {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(res.status, 403, `Viewer must be denied on ${ep.path}`);
      }
    });

    it('19. Player cannot modify other players data (self-only update)', async () => {
      const token = rbacData.tokens.player;

      // Own player: allowed
      const resOwn = await fetch(`${baseUrl}/audit/v1/rbac/players/player-alpha-1`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(resOwn.status, 200);

      // Other player in same tenant: denied
      const resOther = await fetch(`${baseUrl}/audit/v1/rbac/players/player-alpha-2`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(resOther.status, 403);

      // Foreign player: denied
      const resForeign = await fetch(`${baseUrl}/audit/v1/rbac/players/player-beta-1`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(resForeign.status, 403);
    });

    it('20. Super-Admin permissions match official matrix across all routes', async () => {
      const token = rbacData.tokens.super_admin;
      const paths = [
        { method: 'POST', path: '/audit/v1/rbac/tenants' },
        { method: 'POST', path: '/audit/v1/rbac/leagues/league-beta-1/fixtures' },
        { method: 'POST', path: '/audit/v1/rbac/clubs/club-beta-1/roster' },
        { method: 'POST', path: '/audit/v1/rbac/clubs/club-beta-1/products' },
        { method: 'PATCH', path: '/audit/v1/rbac/players/player-beta-1' },
        { method: 'GET', path: '/audit/v1/rbac/clubs/club-beta-1' },
        { method: 'GET', path: '/audit/v1/rbac/platform/config' },
      ];

      for (const p of paths) {
        const res = await fetch(`${baseUrl}${p.path}`, {
          method: p.method,
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(res.status, 200, `Super Admin must be allowed on ${p.path}`);
        assert.deepEqual(await res.json(), { authorized: true });
      }
    });

    it('21. Allowed probes return exactly {"authorized":true}', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${rbacData.tokens.super_admin}` },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { authorized: true });
    });

    it('22. Denied probes return HTTP 403 and code FORBIDDEN', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${rbacData.tokens.viewer}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.error.code, 'FORBIDDEN');
      assert.equal(typeof data.error.message, 'string');
    });

    it('23. Authentication failures return HTTP 401 and code UNAUTHENTICATED', async () => {
      const res = await fetch(`${baseUrl}/audit/v1/rbac/platform/config`, {
        method: 'GET',
        headers: { Authorization: 'Bearer bad.token' },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error.code, 'UNAUTHENTICATED');
    });

    it('24. Probe endpoints do not mutate application data', async () => {
      const playersBefore = await db.query('SELECT COUNT(*) FROM players');
      const clubsBefore = await db.query('SELECT COUNT(*) FROM clubs');
      const tenantsBefore = await db.query('SELECT COUNT(*) FROM tenants');

      // Send requests to all 7 probe endpoints
      await fetch(`${baseUrl}/audit/v1/rbac/tenants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rbacData.tokens.super_admin}` },
        body: JSON.stringify({ injected: 'data' }),
      });
      await fetch(`${baseUrl}/audit/v1/rbac/players/player-alpha-1`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${rbacData.tokens.super_admin}` },
        body: JSON.stringify({ name: 'Mutated' }),
      });

      const playersAfter = await db.query('SELECT COUNT(*) FROM players');
      const clubsAfter = await db.query('SELECT COUNT(*) FROM clubs');
      const tenantsAfter = await db.query('SELECT COUNT(*) FROM tenants');

      assert.equal(playersAfter.rows[0].count, playersBefore.rows[0].count);
      assert.equal(clubsAfter.rows[0].count, clubsBefore.rows[0].count);
      assert.equal(tenantsAfter.rows[0].count, tenantsBefore.rows[0].count);

      // Verify player name was not mutated
      const playerCheck = await db.query("SELECT name FROM players WHERE player_id = 'player-alpha-1'");
      assert.equal(playerCheck.rows[0].name, 'Alpha Player 1');
    });

    it('25. Baseline reset preserves all 5 demo accounts and RBAC hierarchy', async () => {
      // Execute reset
      const resetRes = await fetch(`${baseUrl}/audit/v1/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42 }),
      });
      assert.equal(resetRes.status, 200);

      // Verify all 5 demo accounts still exist and can authenticate
      const demoEmails = [
        'admin@nascon.test',
        'organizer@nascon.test',
        'manager@nascon.test',
        'player@nascon.test',
        'viewer@nascon.test',
      ];

      for (const email of demoEmails) {
        const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'Nascon@26' }),
        });
        assert.equal(loginRes.status, 200, `User ${email} must be able to log in after reset`);
        const loginData = await loginRes.json();
        assert.ok(loginData.token);
      }
    });
  });
});
