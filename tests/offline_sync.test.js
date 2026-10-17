'use strict';

/**
 * Focused spec tests: POST /audit/v1/offline-sync (5.14).
 * Exercises applied/appended, duplicate replay, INVALID_BASE_VERSION,
 * unknown-id rejection and rule rejection. The whole request is always 200.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');

describe('Offline Sync (5.14)', () => {
  let server;
  let baseUrl;

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const ev = (event_id, match_id, type, payload) => post('/audit/v1/events', { event_id, match_id, type, payload });
  const scoreAction = (action_id, base_version, event_id) => ({
    action_id, type: 'score_event', queued_at: '2026-10-17T11:00:00Z', base_version,
    payload: { event_id, match_id: 'om-1', type: 'score', payload: { team_id: 'h', event_type: 'goal' } },
  });

  before(async () => {
    await db.migrate();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
    await post('/audit/v1/reset', {});
    await ev('om-i', 'om-1', 'match_init', { sport_id: 'football', home_team_id: 'h', away_team_id: 'a' });
    await ev('om-s', 'om-1', 'match_start', {}); // match version now 2
  });

  after(async () => {
    await post('/audit/v1/reset', {}).catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.close();
  });

  it('applies a score_event when base_version == current version (appended)', async () => {
    const res = await post('/audit/v1/offline-sync', { device_id: 'dev-1', actions: [scoreAction('a1', 2, 'off-g1')] });
    assert.equal(res.status, 200);
    const d = await res.json();
    const r = d.results[0];
    assert.equal(r.status, 'applied');
    assert.equal(r.resolution, 'appended');
    assert.equal(r.error_code, null);
    assert.equal(r.server_version, 3);
    assert.match(r.signature, /^[0-9a-f]{64}$/);
    assert.equal(r.processed_order, 1);
    assert.deepEqual(d.summary, { applied: 1, rejected: 0, duplicate: 0 });
  });

  it('returns duplicate for every action when the same request is re-sent (changes nothing)', async () => {
    const res = await post('/audit/v1/offline-sync', { device_id: 'dev-1', actions: [scoreAction('a1', 2, 'off-g1')] });
    const d = await res.json();
    assert.equal(d.results[0].status, 'duplicate');
    assert.equal(d.results[0].resolution, 'skipped_duplicate');
    assert.equal(d.summary.duplicate, 1);
  });

  it('rejects base_version greater than current version with INVALID_BASE_VERSION', async () => {
    const d = await (await post('/audit/v1/offline-sync', { device_id: 'dev-2', actions: [scoreAction('b1', 99, 'off-b1')] })).json();
    assert.equal(d.results[0].status, 'rejected');
    assert.equal(d.results[0].resolution, 'server_wins');
    assert.equal(d.results[0].error_code, 'INVALID_BASE_VERSION');
  });

  it('rejects an action referencing an unknown match with MATCH_NOT_FOUND', async () => {
    const d = await (await post('/audit/v1/offline-sync', {
      device_id: 'dev-3',
      actions: [{ action_id: 'c1', type: 'score_event', queued_at: '2026-10-17T11:00:00Z', base_version: 0, payload: { event_id: 'off-c1', match_id: 'ghost', type: 'score', payload: { team_id: 'h', event_type: 'goal' } } }],
    })).json();
    assert.equal(d.results[0].status, 'rejected');
    assert.equal(d.results[0].error_code, 'MATCH_NOT_FOUND');
  });

  it('processes actions in queued_at order but returns results in request order', async () => {
    const d = await (await post('/audit/v1/offline-sync', {
      device_id: 'dev-4',
      actions: [
        { action_id: 'late', type: 'score_event', queued_at: '2026-10-17T12:00:00Z', base_version: 3, payload: { event_id: 'off-late', match_id: 'om-1', type: 'score', payload: { team_id: 'h', event_type: 'goal' } } },
        { action_id: 'early', type: 'score_event', queued_at: '2026-10-17T10:00:00Z', base_version: 3, payload: { event_id: 'off-early', match_id: 'om-1', type: 'score', payload: { team_id: 'a', event_type: 'goal' } } },
      ],
    })).json();
    // results in request order
    assert.equal(d.results[0].action_id, 'late');
    assert.equal(d.results[1].action_id, 'early');
    // but the earlier queued_at was processed first
    assert.equal(d.results[1].processed_order, 1);
    assert.equal(d.results[0].processed_order, 2);
  });

  it('returns HTTP 400 for a malformed envelope (empty actions)', async () => {
    const res = await post('/audit/v1/offline-sync', { device_id: 'dev-5', actions: [] });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
  });
});
