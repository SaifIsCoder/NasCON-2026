'use strict';

/**
 * Focused spec tests: POST /audit/v1/sports (5.6) and POST /audit/v1/leagues (5.8).
 * Uses the specification's own example requests.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/db');

describe('Sports (5.6) & Leagues (5.8)', () => {
  let server;
  let baseUrl;

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

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

  const kabaddi = {
    sport_id: 'kabaddi', name: 'Kabaddi', scoring_model: 'event',
    periods: { count: 2, duration_minutes: 20 },
    scoring_events: { raid_point: { points: 1 }, tackle_point: { points: 1 }, all_out: { points: 2 } },
    draw_allowed: false, overtime: { policy: 'golden_score', duration_minutes: 5 },
    tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
    roster: { min_squad_size: 7, max_squad_size: 12, required_positions: { raider: 2, defender: 3 } },
  };

  it('creates a mystery sport and echoes stored config (201)', async () => {
    const res = await post('/audit/v1/sports', kabaddi);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.sport_id, 'kabaddi');
    assert.equal(data.status, 'created');
    assert.equal(data.config.scoring_events.all_out.points, 2);
    assert.equal(data.config.scoring_model, 'event');
    // draw_lots always applied last in tie_break_order
    assert.equal(data.config.tie_break_order[data.config.tie_break_order.length - 1], 'draw_lots');
  });

  it('rejects a duplicate sport_id with 409 SPORT_EXISTS', async () => {
    const res = await post('/audit/v1/sports', kabaddi);
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.error.code, 'SPORT_EXISTS');
  });

  it('rejects a SQL-injection sport_id with 400 VALIDATION_ERROR', async () => {
    const res = await post('/audit/v1/sports', { ...kabaddi, sport_id: "x'; DROP TABLE sports;--" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'VALIDATION_ERROR');
    assert.ok(data.error.details.fields.includes('sport_id'));
  });

  it('rejects an invalid scoring_model with 400 and lists the field', async () => {
    const res = await post('/audit/v1/sports', { ...kabaddi, sport_id: 'badmodel', scoring_model: 'nope' });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.details.fields.includes('scoring_model'));
  });

  it('registers a league (201 with counts) per the 5.8 example', async () => {
    const res = await post('/audit/v1/leagues', {
      league_id: 'lg-1', sport_id: 'football', teams: ['t1', 't2', 't3', 't4'],
      fixtures: [{ match_id: 'm1', home: 't1', away: 't2' }, { match_id: 'm2', home: 't3', away: 't4' }],
      points: { win: 3, draw: 1, loss: 0 },
      tie_break_order: ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'],
      qualification: { spots: 2 }, lots_seed: 42,
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.deepEqual(data, { league_id: 'lg-1', status: 'created', team_count: 4, fixture_count: 2 });
  });

  it('rejects a duplicate league_id with 409 LEAGUE_EXISTS', async () => {
    const res = await post('/audit/v1/leagues', { league_id: 'lg-1', sport_id: 'football', teams: ['t1', 't2'], fixtures: [], qualification: { spots: 1 } });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'LEAGUE_EXISTS');
  });

  it('rejects an unknown sport with 404 SPORT_NOT_FOUND', async () => {
    const res = await post('/audit/v1/leagues', { league_id: 'lg-2', sport_id: 'no-sport', teams: ['t1', 't2'], fixtures: [], qualification: { spots: 1 } });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'SPORT_NOT_FOUND');
  });

  it('rejects a fixture whose match_id is already used with 409 MATCH_EXISTS', async () => {
    const res = await post('/audit/v1/leagues', {
      league_id: 'lg-3', sport_id: 'football', teams: ['t1', 't2'],
      fixtures: [{ match_id: 'm1', home: 't1', away: 't2' }], qualification: { spots: 1 },
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'MATCH_EXISTS');
  });

  it('rejects qualification.spots greater than team count with 400', async () => {
    const res = await post('/audit/v1/leagues', { league_id: 'lg-4', sport_id: 'football', teams: ['t1', 't2'], fixtures: [], qualification: { spots: 5 } });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error.details.fields.includes('qualification'));
  });
});
