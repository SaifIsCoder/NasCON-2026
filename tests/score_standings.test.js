'use strict';

/**
 * Focused spec tests: GET /audit/v1/score/{match_id} (5.9) and
 * GET /audit/v1/standings/{league_id} (5.10). Builds a small football league,
 * plays its fixtures through /events, then reads the projection and table.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');

describe('Score projection (5.9) & Standings (5.10)', () => {
  let server;
  let baseUrl;

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const get = (path) => fetch(`${baseUrl}${path}`);
  const ev = (event_id, match_id, type, payload) => post('/audit/v1/events', { event_id, match_id, type, payload });

  before(async () => {
    await db.migrate();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
    await post('/audit/v1/reset', {});

    // League: 4 teams, 3 fixtures. t1 beats t2; t3 draws t4; t1 beats t3.
    await post('/audit/v1/leagues', {
      league_id: 'lg-s', sport_id: 'football', teams: ['t1', 't2', 't3', 't4'],
      fixtures: [
        { match_id: 'ms1', home: 't1', away: 't2' },
        { match_id: 'ms2', home: 't3', away: 't4' },
        { match_id: 'ms3', home: 't1', away: 't3' },
      ],
      qualification: { spots: 2 }, lots_seed: 42,
    });

    // ms1: t1 2-0 t2
    await ev('s-1', 'ms1', 'match_start', {});
    await ev('s-2', 'ms1', 'score', { team_id: 't1', event_type: 'goal' });
    await ev('s-3', 'ms1', 'score', { team_id: 't1', event_type: 'goal' });
    await ev('s-4', 'ms1', 'match_end', {});
    // ms2: t3 1-1 t4 (draw)
    await ev('s-5', 'ms2', 'match_start', {});
    await ev('s-6', 'ms2', 'score', { team_id: 't3', event_type: 'goal' });
    await ev('s-7', 'ms2', 'score', { team_id: 't4', event_type: 'goal' });
    await ev('s-8', 'ms2', 'match_end', {});
    // ms3: t1 1-0 t3
    await ev('s-9', 'ms3', 'match_start', {});
    await ev('s-10', 'ms3', 'score', { team_id: 't1', event_type: 'goal' });
    await ev('s-11', 'ms3', 'match_end', {});
  });

  after(async () => {
    await post('/audit/v1/reset', {}).catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.close();
  });

  it('rebuilds a completed match score projection (home_win)', async () => {
    const res = await get('/audit/v1/score/ms1');
    assert.equal(res.status, 200);
    const d = await res.json();
    assert.equal(d.status, 'completed');
    assert.equal(d.outcome, 'home_win');
    assert.equal(d.winner_team_id, 't1');
    assert.equal(d.home.score, 2);
    assert.equal(d.away.score, 0);
    assert.equal(d.home.wickets, null); // event model -> innings fields null
    assert.equal(typeof d.version, 'number');
    assert.ok(Array.isArray(d.events) && d.events.length === d.version);
  });

  it('projects a draw with winner null', async () => {
    const d = await (await get('/audit/v1/score/ms2')).json();
    assert.equal(d.outcome, 'draw');
    assert.equal(d.winner_team_id, null);
  });

  it('returns 404 MATCH_NOT_FOUND for an unknown match', async () => {
    const res = await get('/audit/v1/score/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'MATCH_NOT_FOUND');
  });

  it('computes the standings table with points, h2h and qualification', async () => {
    const res = await get('/audit/v1/standings/lg-s');
    assert.equal(res.status, 200);
    const d = await res.json();
    assert.equal(d.league_id, 'lg-s');
    assert.equal(d.qualification_spots, 2);
    assert.equal(d.table.length, 4);

    const row = (t) => d.table.find((r) => r.team_id === t);
    // t1: 2 wins = 6 pts, rank 1
    assert.equal(row('t1').points, 6);
    assert.equal(row('t1').won, 2);
    assert.equal(row('t1').rank, 1);
    assert.equal(row('t1').diff, 3); // scored 3, conceded 0
    // t3: 1 draw + 1 loss = 1 pt
    assert.equal(row('t3').points, 1);
    assert.equal(row('t3').drawn, 1);
    assert.equal(row('t3').lost, 1);
    // t2: 1 loss = 0 pts; t4: 1 draw = 1 pt
    assert.equal(row('t2').points, 0);
    assert.equal(row('t4').points, 1);

    // h2h present for every ordered pair; t1 beat t2
    assert.deepEqual(d.h2h.t1.t2, { played: 1, points: 3, scored: 2, conceded: 0 });
    assert.deepEqual(d.h2h.t2.t1, { played: 1, points: 0, scored: 0, conceded: 2 });
    // never-met pair -> zeros
    assert.deepEqual(d.h2h.t2.t4, { played: 0, points: 0, scored: 0, conceded: 0 });
  });

  it('breaks a points tie deterministically and records resolved_by', async () => {
    const d = await (await get('/audit/v1/standings/lg-s')).json();
    const tied = d.table.filter((r) => r.points === 1); // t3 and t4
    assert.equal(tied.length, 2);
    // The higher-ranked tied team was separated by a tie-break criterion.
    assert.ok(tied[0].resolved_by !== null);
    // The lower-ranked tied team has nothing tied below it.
    assert.equal(tied[1].resolved_by, null);
  });
});
