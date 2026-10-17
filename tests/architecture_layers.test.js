'use strict';

/**
 * Architecture Layers & Modular Backend Test Suite
 * Validates clean separation of concerns:
 * Route -> Middleware -> Controller -> Service -> Repository -> PostgreSQL.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/database');
const { env } = require('../src/config/env');
const { getRedisClient } = require('../src/config/redis');
const { logger } = require('../src/config/logger');

const { ROLES, ALL_ROLES } = require('../src/constants/roles.constants');
const { PERMISSIONS } = require('../src/constants/permissions.constants');
const { HTTP_STATUS } = require('../src/constants/http-status.constants');
const { ERROR_CODES } = require('../src/constants/error-codes.constants');
const { APP_CONSTANTS } = require('../src/constants/app.constants');
const { ROUTES } = require('../src/constants/routes.constants');

const { ApiError } = require('../src/utils/api-error');
const { ApiResponse } = require('../src/utils/api-response');
const { parsePagination } = require('../src/utils/pagination.util');
const { toIsoString, now } = require('../src/utils/date.util');

const { RbacPolicy } = require('../src/policies/rbac.policy');
const { TenantPolicy } = require('../src/policies/tenant.policy');
const { RosterPolicy } = require('../src/policies/roster.policy');
const { LeaguePolicy } = require('../src/policies/league.policy');

const { AuthValidator } = require('../src/validators/auth.validator');
const { ResetValidator } = require('../src/validators/reset.validator');
const { EventsValidator } = require('../src/validators/events.validator');
const { CheckoutValidator } = require('../src/validators/checkout.validator');
const { SportsValidator } = require('../src/validators/sports.validator');
const { FixturesValidator } = require('../src/validators/fixtures.validator');
const { LeaguesValidator } = require('../src/validators/leagues.validator');
const { RosterValidator } = require('../src/validators/roster.validator');
const { OfflineSyncValidator } = require('../src/validators/offline-sync.validator');

const { UserRepository } = require('../src/repositories/user.repository');
const { TenantRepository } = require('../src/repositories/tenant.repository');
const { SportRepository } = require('../src/repositories/sport.repository');
const { LeagueRepository } = require('../src/repositories/league.repository');
const { FixtureRepository } = require('../src/repositories/fixture.repository');
const { EventRepository } = require('../src/repositories/event.repository');
const { RosterRepository } = require('../src/repositories/roster.repository');
const { InventoryRepository } = require('../src/repositories/inventory.repository');
const { OrderRepository } = require('../src/repositories/order.repository');
const { RbacRepository } = require('../src/repositories/rbac.repository');

const { ResetService } = require('../src/services/reset.service');
const { HealthService } = require('../src/services/health.service');
const { AuthService } = require('../src/services/auth.service');
const { TokenService } = require('../src/services/token.service');
const { SportsService } = require('../src/services/sports.service');
const { FixturesService } = require('../src/services/fixtures.service');
const { LeaguesService } = require('../src/services/leagues.service');
const { StandingsService } = require('../src/services/standings.service');
const { RosterService } = require('../src/services/roster.service');
const { OfflineSyncService } = require('../src/services/offline-sync.service');

const { withTransaction } = require('../src/database/transactions');
const { MockPaymentGateway } = require('../src/integrations/payment/mock-payment.gateway');

describe('Architecture Layers Verification Suite', () => {
  let server;
  let baseUrl;

  before(async () => {
    await db.migrate();
    await ResetService.performReset({ seed: 42 });

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
  });

  describe('1. Configuration & Constants Integrity', () => {
    it('verifies environment configuration values', () => {
      assert.ok(env.PORT > 0);
      assert.ok(env.DATABASE_URL);
      assert.ok(env.JWT_SECRET);
      assert.ok(env.POSTGRES_DB);
    });

    it('verifies Redis configuration and mock client', async () => {
      const client = getRedisClient();
      assert.ok(client);
      await client.set('test_key', 'test_val');
      const val = await client.get('test_key');
      assert.equal(val, 'test_val');
      await client.del('test_key');
    });

    it('verifies all five official roles in constants', () => {
      assert.equal(ALL_ROLES.length, 5);
      assert.ok(ALL_ROLES.includes('super_admin'));
      assert.ok(ALL_ROLES.includes('league_organizer'));
      assert.ok(ALL_ROLES.includes('club_manager'));
      assert.ok(ALL_ROLES.includes('player'));
      assert.ok(ALL_ROLES.includes('viewer'));
    });

    it('verifies error codes, http status, and routes constants', () => {
      assert.equal(HTTP_STATUS.OK, 200);
      assert.equal(HTTP_STATUS.BAD_REQUEST, 400);
      assert.equal(HTTP_STATUS.UNAUTHORIZED, 401);
      assert.equal(HTTP_STATUS.FORBIDDEN, 403);
      assert.equal(HTTP_STATUS.PAYLOAD_TOO_LARGE, 413);

      assert.equal(ERROR_CODES.VALIDATION_ERROR, 'VALIDATION_ERROR');
      assert.equal(ERROR_CODES.UNAUTHENTICATED, 'UNAUTHENTICATED');
      assert.equal(ERROR_CODES.FORBIDDEN, 'FORBIDDEN');
      assert.equal(ERROR_CODES.OUT_OF_STOCK, 'OUT_OF_STOCK');

      assert.equal(ROUTES.HEALTH, '/health');
      assert.equal(ROUTES.RESET, '/audit/v1/reset');
      assert.equal(ROUTES.EVENTS, '/audit/v1/events');
    });
  });

  describe('2. Utilities & Helper Layer', () => {
    it('verifies ApiError instantiation and factories', () => {
      const badReq = ApiError.badRequest('Invalid field', { fields: ['name'] });
      assert.equal(badReq.statusCode, 400);
      assert.equal(badReq.code, 'VALIDATION_ERROR');
      assert.deepEqual(badReq.details, { fields: ['name'] });

      const forbidden = ApiError.forbidden('Denied');
      assert.equal(forbidden.statusCode, 403);
      assert.equal(forbidden.code, 'FORBIDDEN');
    });

    it('verifies pagination utility handles edge cases', () => {
      const p1 = parsePagination({ page: '2', limit: '10' });
      assert.equal(p1.page, 2);
      assert.equal(p1.limit, 10);
      assert.equal(p1.offset, 10);

      const p2 = parsePagination({ page: '-5', limit: '999' });
      assert.equal(p2.page, 1);
      assert.equal(p2.limit, 100);
      assert.equal(p2.offset, 0);
    });

    it('verifies date utility ISO serialization', () => {
      const d = now();
      assert.ok(d instanceof Date);
      const iso = toIsoString(d);
      assert.match(iso, /^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('3. Policies Layer', () => {
    it('enforces TenantPolicy isolation boundaries', () => {
      const superAdmin = { role: ROLES.SUPER_ADMIN, tenant_id: null };
      const alphaUser = { role: ROLES.CLUB_MANAGER, tenant_id: 'tenant-alpha' };

      // Super admin can access any tenant
      assert.equal(TenantPolicy.canAccessTenant(superAdmin, 'tenant-beta'), true);

      // Alpha user can access alpha
      assert.equal(TenantPolicy.canAccessTenant(alphaUser, 'tenant-alpha'), true);

      // Alpha user cannot access beta
      assert.throws(
        () => TenantPolicy.canAccessTenant(alphaUser, 'tenant-beta'),
        (err) => err.statusCode === 403 && err.code === 'FORBIDDEN'
      );
    });

    it('enforces LeaguePolicy organizer ownership', () => {
      const organizer = { role: ROLES.LEAGUE_ORGANIZER, league_id: 'league-alpha-1' };
      assert.equal(LeaguePolicy.canManageLeagueFixtures(organizer, 'league-alpha-1'), true);

      assert.throws(
        () => LeaguePolicy.canManageLeagueFixtures(organizer, 'league-alpha-2'),
        (err) => err.statusCode === 403 && err.code === 'FORBIDDEN'
      );
    });

    it('enforces RosterPolicy manager ownership', () => {
      const manager = { role: ROLES.CLUB_MANAGER, club_id: 'club-alpha-1' };
      assert.equal(RosterPolicy.canManageClubRoster(manager, 'club-alpha-1'), true);

      assert.throws(
        () => RosterPolicy.canManageClubRoster(manager, 'club-alpha-2'),
        (err) => err.statusCode === 403 && err.code === 'FORBIDDEN'
      );
    });
  });

  describe('4. Validators Layer', () => {
    it('validates SportsValidator fields and rejects invalid scoring model', () => {
      assert.throws(
        () => SportsValidator.validateSport({ sport_id: 'golf', name: 'Golf', scoring_model: 'invalid' }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );

      const valid = SportsValidator.validateSport({
        sport_id: 'tennis',
        name: 'Tennis',
        scoring_model: 'round',
        config: { sets: 3 },
      });
      assert.equal(valid.sport_id, 'tennis');
    });

    it('validates FixturesValidator format and team count', () => {
      assert.throws(
        () => FixturesValidator.validateFixtureGeneration({ league_id: 'l1', format: 'unknown', teams: ['A', 'B'] }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );

      assert.throws(
        () => FixturesValidator.validateFixtureGeneration({ league_id: 'l1', format: 'round_robin', teams: ['A'] }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );
    });

    it('validates LeaguesValidator required fields', () => {
      assert.throws(
        () => LeaguesValidator.validateLeague({ league_id: 'l1' }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );
    });

    it('validates RosterValidator transfer inputs', () => {
      assert.throws(
        () => RosterValidator.validateTransfer({ player_id: 'p1', target_club_id: 'c2', transfer_type: 'bribe' }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );
    });

    it('validates OfflineSyncValidator operations array', () => {
      assert.throws(
        () => OfflineSyncValidator.validateSyncBatch({ device_id: 'dev1', operations: 'not_array' }),
        (err) => err.statusCode === 400 && err.code === 'VALIDATION_ERROR'
      );
    });
  });

  describe('5. Repositories Layer', () => {
    it('UserRepository finds user by email and demo accounts', async () => {
      const user = await UserRepository.findByEmail('admin@nascon.test');
      assert.ok(user);
      assert.equal(user.role, 'super_admin');

      const demos = await UserRepository.findDemoUsers();
      assert.equal(demos.length, 5);
    });

    it('TenantRepository retrieves baseline tenants', async () => {
      const tenants = await TenantRepository.findBaselineTenants();
      assert.equal(tenants.length, 2);
    });

    it('SportRepository retrieves baseline sports', async () => {
      const sports = await SportRepository.findBaselineSports();
      assert.equal(sports.length, 4);
    });

    it('InventoryRepository fetches variants and checks stock', async () => {
      const variant = await InventoryRepository.findVariantById('var-jersey-001-M');
      assert.ok(variant);
      assert.equal(variant.price_minor, 450000);
      assert.equal(variant.currency, 'PKR');
    });

    it('RbacRepository retrieves audit reset state record', async () => {
      const state = await RbacRepository.getAuditResetState();
      assert.ok(state);
      assert.equal(state.seed, 42);
    });
  });

  describe('6. Integrations & Domain Services', () => {
    it('MockPaymentGateway processes tok_success and declines tok_declined', async () => {
      const success = await MockPaymentGateway.processPayment({ token: 'tok_success' }, 50000);
      assert.equal(success.state, 'captured');
      assert.ok(success.authorization_id);
      assert.ok(success.capture_id);

      await assert.rejects(
        async () => MockPaymentGateway.processPayment({ token: 'tok_declined' }, 50000),
        (err) => err.statusCode === 402 && err.code === 'PAYMENT_DECLINED'
      );
    });

    it('FixturesService generates round-robin tournament fixtures', async () => {
      const res = await FixturesService.generateFixtures({
        league_id: 'test-league-rr',
        format: 'round_robin',
        teams: ['team-1', 'team-2', 'team-3', 'team-4'],
      });
      assert.equal(res.league_id, 'test-league-rr');
      assert.equal(res.total_matches, 6); // 4 teams -> 3 rounds * 2 matches = 6
    });

    it('StandingsService returns initialized standings table for existing league', async () => {
      const res = await StandingsService.getStandings('league-alpha-1');
      assert.equal(res.league_id, 'league-alpha-1');
      assert.equal(res.season, '2026');
      assert.ok(Array.isArray(res.table));
    });
  });

  describe('7. HTTP End-to-End Route Invocations', () => {
    it('POST /audit/v1/sports registers a new sport', async () => {
      const resp = await fetch(`${baseUrl}/audit/v1/sports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport_id: 'rugby',
          name: 'Rugby Union',
          scoring_model: 'event',
          config: { periods: { count: 2, duration_minutes: 40 } },
        }),
      });
      assert.equal(resp.status, 201);
      const data = await resp.json();
      assert.equal(data.status, 'created');
      assert.equal(data.sport.sport_id, 'rugby');
    });

    it('POST /audit/v1/leagues registers a new league', async () => {
      const resp = await fetch(`${baseUrl}/audit/v1/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: 'league-test-01',
          tenant_id: 'tenant-alpha',
          sport_id: 'football',
          name: 'Premier Football League',
          config: {},
        }),
      });
      assert.equal(resp.status, 201);
      const data = await resp.json();
      assert.equal(data.status, 'created');
      assert.equal(data.league.league_id, 'league-test-01');
    });

    it('POST /audit/v1/fixtures generates fixtures over HTTP', async () => {
      const resp = await fetch(`${baseUrl}/audit/v1/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: 'league-alpha-1',
          format: 'round_robin',
          teams: ['club-alpha-1', 'club-alpha-2'],
        }),
      });
      assert.equal(resp.status, 201);
      const data = await resp.json();
      assert.equal(data.total_matches, 1);
    });

    it('GET /audit/v1/standings/league-alpha-1 returns standings', async () => {
      const resp = await fetch(`${baseUrl}/audit/v1/standings/league-alpha-1`);
      assert.equal(resp.status, 200);
      const data = await resp.json();
      assert.equal(data.league_id, 'league-alpha-1');
    });

    it('POST /audit/v1/roster/setup and GET /audit/v1/roster/history/:player_id', async () => {
      const setupResp = await fetch(`${baseUrl}/audit/v1/roster/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: 'club-alpha-1',
          players: [
            { player_id: 'player-test-01', name: 'Test Striker', position: 'Forward' },
          ],
        }),
      });
      assert.equal(setupResp.status, 200);

      const histResp = await fetch(`${baseUrl}/audit/v1/roster/history/player-test-01`);
      assert.equal(histResp.status, 200);
      const histData = await histResp.json();
      assert.equal(histData.player_id, 'player-test-01');
    });

    it('POST /audit/v1/offline-sync replays batch operations', async () => {
      const resp = await fetch(`${baseUrl}/audit/v1/offline-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'tablet-referee-01',
          operations: [
            { id: 'op_1', type: 'score_update', match_id: 'm1' },
          ],
        }),
      });
      assert.equal(resp.status, 200);
      const data = await resp.json();
      assert.equal(data.synced_count, 1);
    });

    it('GET /api/v1/ping rate-limiting probe responds with HTTP 200', async () => {
      const resp = await fetch(`${baseUrl}/api/v1/ping`);
      assert.equal(resp.status, 200);
      const data = await resp.json();
      assert.equal(data.status, 'ok');
    });

    it('Unknown route returns HTTP 404 NOT_FOUND JSON error', async () => {
      const resp = await fetch(`${baseUrl}/non_existent_route`);
      assert.equal(resp.status, 404);
      const data = await resp.json();
      assert.equal(data.error.code, 'NOT_FOUND');
    });
  });
});
