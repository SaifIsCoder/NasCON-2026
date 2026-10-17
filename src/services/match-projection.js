'use strict';

/**
 * Match Projection (Section 5.9)
 * Rebuilds a match's score, per-team stats and outcome purely from the
 * append-only event log + the sport config. Compensated events and the
 * compensation events themselves are treated as neutral. Used by both
 * GET /audit/v1/score/{match_id} and GET /audit/v1/standings/{league_id}.
 */

function parseConfig(sport) {
  if (!sport) return null;
  return typeof sport.config === 'string' ? JSON.parse(sport.config) : sport.config;
}

/**
 * @param {Object} match  matches row (home_team_id, away_team_id, status, sport_id, league_id)
 * @param {Array}  events ordered match_events rows (sequence asc) incl. compensated + compensation
 * @param {Object} sport  sports row (config may be string or object)
 * @returns {Object} projection
 */
function projectMatch(match, events, sport) {
  const config = parseConfig(sport);
  const model = config ? config.scoring_model : 'event';
  const scoringEvents = (config && config.scoring_events) || {};
  const drawAllowed = config ? !!config.draw_allowed : true;

  const homeId = match.home_team_id;
  const awayId = match.away_team_id;

  const stat = () => ({ score: 0, wickets: 0, balls: 0, fair_play: 0 });
  const teams = { [homeId]: stat(), [awayId]: stat() };
  const ensure = (tid) => {
    if (!teams[tid]) teams[tid] = stat();
    return teams[tid];
  };

  let tiebreakWinner = null;

  for (const ev of events) {
    if (ev.compensated || ev.type === 'compensation') continue; // neutral
    const payload = ev.payload || {};

    if (ev.type === 'score') {
      const def = scoringEvents[payload.event_type];
      if (!def) continue;
      const t = ensure(payload.team_id);
      if (model === 'event') {
        t.score += def.points || 0;
      } else if (model === 'innings') {
        t.score += def.runs || 0;
        if (def.legal_ball) t.balls += 1;
        if (def.wicket) t.wickets += 1;
      } else if (model === 'round') {
        t.score += def.rounds || 0;
      }
    } else if (ev.type === 'discipline') {
      const t = ensure(payload.team_id);
      t.fair_play += typeof payload.points === 'number' ? payload.points : 0;
    } else if (ev.type === 'tiebreak_winner') {
      tiebreakWinner = payload.team_id || null;
    }
  }

  const home = teams[homeId];
  const away = teams[awayId];
  const bpo = model === 'innings' && config.periods ? config.periods.balls_per_over : null;

  const sideView = (tid, s) => ({
    team_id: tid,
    score: s.score,
    wickets: model === 'innings' ? s.wickets : null,
    balls: model === 'innings' ? s.balls : null,
    overs: model === 'innings' ? `${Math.floor(s.balls / bpo)}.${s.balls % bpo}` : null,
    fair_play: s.fair_play,
  });

  const status = match.status;
  let outcome = 'pending';
  let winner = null;
  let tbWinner = null;

  if (status === 'completed') {
    if (home.score > away.score) {
      outcome = 'home_win';
      winner = homeId;
    } else if (away.score > home.score) {
      outcome = 'away_win';
      winner = awayId;
    } else {
      // Level score
      if (tiebreakWinner) {
        tbWinner = tiebreakWinner;
        winner = tiebreakWinner;
        outcome = tiebreakWinner === homeId ? 'home_win' : 'away_win';
      } else if (drawAllowed) {
        outcome = 'draw';
      } else {
        outcome = 'undecided';
      }
    }
  }

  return {
    sport_id: match.sport_id,
    league_id: match.league_id,
    status,
    outcome,
    winner_team_id: winner,
    tiebreak_winner_team_id: tbWinner,
    home: sideView(homeId, home),
    away: sideView(awayId, away),
    model,
    homeId,
    awayId,
    _raw: { home, away },
  };
}

module.exports = { projectMatch };
