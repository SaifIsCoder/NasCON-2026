'use strict';

/**
 * Focused spec tests: POST /audit/v1/roster/setup, POST /audit/v1/roster/transfer
 * and GET /audit/v1/roster/history/{player_id} (5.11). Covers the eight ordered
 * rule checks, loans with automatic return, in-progress deferral and idempotency.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');

describe('Roster, Transfers, Loans & History (5.11)', () => {
  let server;
  let baseUrl;

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const get = (path) => fetch(`${baseUrl}${path}`);
  const errCode = async (res) => (await res.json()).error.code;

  const setup = (max = 3, live = []) => post('/audit/v1/roster/setup', {
    league: { league_id: 'lg-r', tenant_id: 'tenant-alpha', sport_id: 'football', transfer_window: { open: '2026-09-01', close: '2026-09-30' }, max_squad_size: max, required_positions: { gk: 1 } },
    squads: [
      { squad_id: 'sq-a', club_id: 'club-a', tenant_id: 'tenant-alpha', name: 'A' },
      { squad_id: 'sq-b', club_id: 'club-b', tenant_id: 'tenant-alpha', name: 'B' },
      { squad_id: 'sq-c', club_id: 'club-c', tenant_id: 'tenant-beta', name: 'C' },
    ],
    players: [
      { player_id: 'p1', name: 'P1', position: 'gk', squad_id: 'sq-a', role: 'captain' },
      { player_id: 'p2', name: 'P2', position: 'df', squad_id: 'sq-a', role: 'starter' },
      { player_id: 'p3', name: 'P3', position: 'df', squad_id: 'sq-a', role: 'starter' },
      { player_id: 'p5', name: 'P5', position: 'df', squad_id: 'sq-a', role: 'starter' },
      { player_id: 'p4', name: 'P4', position: 'df', squad_id: 'sq-b', role: 'starter' },
    ],
    matches_in_progress: live,
  });
  const tr = (o) => post('/audit/v1/roster/transfer', Object.assign({ request_id: 'r', league_id: 'lg-r', type: 'transfer', reason: 'x', requested_by: 'u-1' }, o));

  before(async () => {
    await db.migrate();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
    await post('/audit/v1/reset', {});
  });

  after(async () => {
    await post('/audit/v1/reset', {}).catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.close();
  });

  it('builds a scenario and returns squad counts (201 configured)', async () => {
    const res = await setup();
    assert.equal(res.status, 201);
    const d = await res.json();
    assert.equal(d.status, 'configured');
    assert.deepEqual(d.squad_counts, { 'sq-a': 4, 'sq-b': 1, 'sq-c': 0 });
  });

  it('accepts a valid transfer (201) and is idempotent by request_id (200)', async () => {
    await setup();
    const res = await tr({ request_id: 'tr-1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' });
    assert.equal(res.status, 201);
    const d = await res.json();
    assert.equal(d.status, 'accepted');
    assert.equal(d.state, 'active');
    assert.equal(d.registration.squad_id, 'sq-b');
    assert.equal(d.registration.role, 'substitute');
    assert.equal(d.audit_entry.audit_id, 'au-0001');

    const replay = await tr({ request_id: 'tr-1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' });
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).audit_entry.audit_id, 'au-0001');
  });

  it('enforces the ordered rule checks', async () => {
    await setup();
    // #1 schema (loan requires loan_end_date > effective_date)
    assert.equal(await errCode(await tr({ request_id: 'c1', type: 'loan', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15', loan_end_date: '2026-09-10' })), 'VALIDATION_ERROR');
    // #2 not found
    assert.equal(await errCode(await tr({ request_id: 'c2', league_id: 'nope', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' })), 'LEAGUE_NOT_FOUND');
    assert.equal(await errCode(await tr({ request_id: 'c3', player_id: 'nope', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' })), 'PLAYER_NOT_FOUND');
    assert.equal(await errCode(await tr({ request_id: 'c4', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'nope', effective_date: '2026-09-15' })), 'SQUAD_NOT_FOUND');
    // #3 cross tenant (sq-c is tenant-beta)
    assert.equal(await errCode(await tr({ request_id: 'c5', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-c', effective_date: '2026-09-15' })), 'CROSS_TENANT_TRANSFER');
    // #5 window closed
    assert.equal(await errCode(await tr({ request_id: 'c6', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-10-15' })), 'TRANSFER_WINDOW_CLOSED');
    // #8 min position (p1 is the only gk, required gk:1)
    assert.equal(await errCode(await tr({ request_id: 'c7', player_id: 'p1', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' })), 'MIN_POSITION_VIOLATION');
  });

  it('#4 NOT_IN_SQUAD when from_squad_id is wrong', async () => {
    await setup();
    await tr({ request_id: 'n1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' });
    const res = await tr({ request_id: 'n2', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'NOT_IN_SQUAD');
  });

  it('#7 SQUAD_FULL when destination would exceed max_squad_size', async () => {
    await setup(2); // sq-b already has p4 (1)
    await tr({ request_id: 'f1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' }); // -> 2
    const res = await tr({ request_id: 'f2', player_id: 'p3', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' }); // -> 3 > 2
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'SQUAD_FULL');
  });

  it('handles a loan, PLAYER_ON_LOAN and automatic return via history as_of', async () => {
    await setup();
    const loan = await tr({ request_id: 'l1', type: 'loan', player_id: 'p5', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-10', loan_end_date: '2026-09-20' });
    assert.equal(loan.status, 201);
    const ld = await loan.json();
    assert.equal(ld.registration.registration_type, 'loan');
    assert.equal(ld.registration.parent_squad_id, 'sq-a');

    // a loaned player cannot be transferred/loaned again
    const onLoan = await tr({ request_id: 'l2', player_id: 'p5', from_squad_id: 'sq-b', to_squad_id: 'sq-a', effective_date: '2026-09-18' });
    assert.equal((await onLoan.json()).error.code, 'PLAYER_ON_LOAN');

    // during the loan window the player is with the borrower
    const during = await (await get('/audit/v1/roster/history/p5?as_of=2026-09-15')).json();
    assert.equal(during.current_squad_id, 'sq-b');

    // the day after loan_end_date, the player is automatically back with the lender
    const after = await (await get('/audit/v1/roster/history/p5?as_of=2026-10-01')).json();
    assert.equal(after.current_squad_id, 'sq-a');
    const actions = after.history.map((h) => h.action);
    assert.deepEqual(actions, ['loan', 'loan_return']);

    // the loan_return entry is written once, never duplicated on repeated calls
    const again = await (await get('/audit/v1/roster/history/p5?as_of=2026-10-05')).json();
    assert.equal(again.history.filter((h) => h.action === 'loan_return').length, 1);
  });

  it('defers a transfer when the player is in an in-progress match', async () => {
    await setup(3, [{ match_id: 'live-1', home_squad_id: 'sq-a', away_squad_id: 'sq-b' }]);
    const res = await tr({ request_id: 'd1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-15' });
    assert.equal(res.status, 201);
    const d = await res.json();
    assert.equal(d.state, 'deferred_until_match_end');
    assert.equal(d.blocking_match_id, 'live-1');
  });

  it('accepts a transfer on the inclusive last day of the window (5.11 example date)', async () => {
    await setup();
    const res = await tr({ request_id: 'w1', player_id: 'p2', from_squad_id: 'sq-a', to_squad_id: 'sq-b', effective_date: '2026-09-30' });
    assert.equal(res.status, 201);
    const d = await res.json();
    assert.equal(d.status, 'accepted');
    assert.equal(d.registration.start_date, '2026-09-30');
  });

  it('returns 404 PLAYER_NOT_FOUND for history of an unknown player', async () => {
    const res = await get('/audit/v1/roster/history/ghost');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'PLAYER_NOT_FOUND');
  });
});
