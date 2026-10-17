'use strict';

/**
 * Automated Standings Service (Section 5.10)
 * Recomputed from scratch from the event logs on every call: points table,
 * head-to-head, exact tie-break resolution (incl. draw_lots) and
 * clinched/eliminated qualification status.
 */

const crypto = require('crypto');
const { LeagueRepository } = require('../repositories/league.repository');
const { SportRepository } = require('../repositories/sport.repository');
const { FixtureRepository } = require('../repositories/fixture.repository');
const { EventRepository } = require('../repositories/event.repository');
const { projectMatch } = require('./match-projection');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class StandingsService {
  static async getStandings(leagueId) {
    const league = await LeagueRepository.findById(leagueId);
    if (!league) {
      throw new ApiError(404, ERROR_CODES.LEAGUE_NOT_FOUND, `League ${leagueId} not found.`);
    }

    const config = typeof league.config === 'string' ? JSON.parse(league.config) : league.config;
    const teams = config.teams || [];
    const fixtures = config.fixtures || [];
    const points = config.points || { win: 3, draw: 1, loss: 0 };
    const tieBreak = config.tie_break_order || ['h2h_points', 'h2h_diff', 'overall_diff', 'scored', 'fair_play', 'draw_lots'];
    const spots = config.qualification ? config.qualification.spots : teams.length;
    const lotsSeed = config.lots_seed !== undefined && config.lots_seed !== null ? config.lots_seed : 42;
    const sportId = config.sport_id || league.sport_id;

    const sport = await SportRepository.findById(sportId);
    const sportConfig = sport ? (typeof sport.config === 'string' ? JSON.parse(sport.config) : sport.config) : {};
    const model = sportConfig.scoring_model || 'event';

    // Project every fixture; keep only "played" ones (completed & decided)
    const played = [];
    for (const f of fixtures) {
      const match = await FixtureRepository.findMatchById(f.match_id);
      if (!match) continue;
      const events = await EventRepository.findByMatchId(f.match_id);
      const proj = projectMatch(match, events, sport);
      if (proj.status === 'completed' && proj.outcome !== 'undecided') {
        played.push({
          match_id: f.match_id,
          home: proj.homeId,
          away: proj.awayId,
          homeScore: proj._raw.home.score,
          awayScore: proj._raw.away.score,
          homeBalls: proj._raw.home.balls,
          awayBalls: proj._raw.away.balls,
          homeWickets: proj._raw.home.wickets,
          awayWickets: proj._raw.away.wickets,
          homeFair: proj._raw.home.fair_play,
          awayFair: proj._raw.away.fair_play,
          outcome: proj.outcome,
        });
      }
    }

    // Per-team aggregates
    const agg = {};
    for (const t of teams) {
      agg[t] = { team_id: t, played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, fair_play: 0 };
    }
    const sideResult = (m, isHome) => {
      const me = isHome ? m.home : m.away;
      const opp = isHome ? m.away : m.home;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const myFair = isHome ? m.homeFair : m.awayFair;
      let res = 'draw';
      if (m.outcome === 'draw') res = 'draw';
      else if ((m.outcome === 'home_win' && isHome) || (m.outcome === 'away_win' && !isHome)) res = 'win';
      else res = 'loss';
      return { me, opp, myScore, oppScore, myFair, res };
    };

    for (const m of played) {
      for (const isHome of [true, false]) {
        const r = sideResult(m, isHome);
        if (!agg[r.me]) continue;
        const a = agg[r.me];
        a.played += 1;
        a.scored += r.myScore;
        a.conceded += r.oppScore;
        a.fair_play += r.myFair;
        if (r.res === 'win') a.won += 1;
        else if (r.res === 'draw') a.drawn += 1;
        else a.lost += 1;
      }
    }

    const pointsOf = (t) => agg[t].won * points.win + agg[t].drawn * points.draw + agg[t].lost * points.loss;

    // ---- Criterion helpers -------------------------------------------------
    // overs faced (innings) with "all out => full overs" rule
    const oversFaced = (balls, wickets) => {
      const bpo = sportConfig.periods ? sportConfig.periods.balls_per_over : 6;
      const wpi = sportConfig.periods ? sportConfig.periods.wickets_per_innings : 10;
      const opi = sportConfig.periods ? sportConfig.periods.overs_per_innings : 20;
      if (wickets >= wpi) return opi;
      return balls / bpo;
    };

    const nrrOver = (matches, team) => {
      let rf = 0, of = 0, rc = 0, ob = 0;
      for (const m of matches) {
        if (m.home !== team && m.away !== team) continue;
        const isHome = m.home === team;
        rf += isHome ? m.homeScore : m.awayScore;
        rc += isHome ? m.awayScore : m.homeScore;
        of += oversFaced(isHome ? m.homeBalls : m.awayBalls, isHome ? m.homeWickets : m.awayWickets);
        ob += oversFaced(isHome ? m.awayBalls : m.homeBalls, isHome ? m.awayWickets : m.homeWickets);
      }
      const a = of > 0 ? rf / of : 0;
      const b = ob > 0 ? rc / ob : 0;
      return Math.round((a - b) * 1000) / 1000;
    };

    const diffOver = (matches, team) => {
      if (model === 'innings') return nrrOver(matches, team);
      let s = 0, c = 0;
      for (const m of matches) {
        if (m.home !== team && m.away !== team) continue;
        const isHome = m.home === team;
        s += isHome ? m.homeScore : m.awayScore;
        c += isHome ? m.awayScore : m.homeScore;
      }
      return s - c;
    };

    const scoredOver = (matches, team) => {
      let s = 0;
      for (const m of matches) {
        if (m.home !== team && m.away !== team) continue;
        s += m.home === team ? m.homeScore : m.awayScore;
      }
      return s;
    };

    const miniMatches = (group) => {
      const set = new Set(group);
      return played.filter((m) => set.has(m.home) && set.has(m.away));
    };

    const h2hPoints = (team, group) => {
      const ms = miniMatches(group);
      let p = 0;
      for (const m of ms) {
        if (m.home !== team && m.away !== team) continue;
        const r = sideResult(m, m.home === team);
        if (r.res === 'win') p += points.win;
        else if (r.res === 'draw') p += points.draw;
        else p += points.loss;
      }
      return p;
    };

    const drawLotHash = (team) =>
      crypto.createHash('sha256').update(`${lotsSeed}|${leagueId}|${team}`, 'utf8').digest('hex');

    // value for a criterion within the current group context
    const critValue = (crit, team, group) => {
      switch (crit) {
        case 'h2h_points': return h2hPoints(team, group);
        case 'h2h_diff': return diffOver(miniMatches(group), team);
        case 'overall_diff': return diffOver(played, team);
        case 'scored': return scoredOver(played, team);
        case 'fair_play': return agg[team].fair_play;
        case 'draw_lots': return drawLotHash(team);
        default: return 0;
      }
    };

    // ---- Recursive tie-break resolution ------------------------------------
    // Returns ordered list of { id, sep } where sep = criterion separating id
    // from the team immediately below it within this tied group (or null).
    const resolve = (group) => {
      if (group.length <= 1) return group.map((id) => ({ id, sep: null }));

      for (const crit of tieBreak) {
        const vals = new Map();
        for (const t of group) vals.set(t, critValue(crit, t, group));

        const distinct = [...new Set(group.map((t) => String(vals.get(t))))];
        if (distinct.length === 1) continue; // all equal -> next criterion

        // Partition into subgroups keyed by value; order subgroups best-first
        const byVal = new Map();
        for (const t of group) {
          const k = String(vals.get(t));
          if (!byVal.has(k)) byVal.set(k, []);
          byVal.get(k).push(t);
        }
        let keys = [...byVal.keys()];
        if (crit === 'draw_lots') {
          keys.sort(); // ascending hash, first = best
        } else {
          keys.sort((a, b) => Number(b) - Number(a)); // higher is better
        }

        const subgroups = keys.map((k) => byVal.get(k));
        const result = [];
        subgroups.forEach((sg, idx) => {
          const sub = resolve(sg);
          // boundary between this subgroup and the next is separated by `crit`
          if (idx < subgroups.length - 1) {
            sub[sub.length - 1].sep = crit;
          }
          result.push(...sub);
        });
        return result;
      }

      // All criteria equal (shouldn't happen since draw_lots is unique)
      return group.map((id) => ({ id, sep: null }));
    };

    // Group by points (desc), resolve each tied group
    const sortedTeams = [...teams].sort((a, b) => pointsOf(b) - pointsOf(a));
    const pointGroups = [];
    for (const t of sortedTeams) {
      const p = pointsOf(t);
      const last = pointGroups[pointGroups.length - 1];
      if (last && last.points === p) last.teams.push(t);
      else pointGroups.push({ points: p, teams: [t] });
    }

    const ordered = [];
    for (const g of pointGroups) {
      if (g.teams.length === 1) {
        ordered.push({ id: g.teams[0], sep: null });
      } else {
        ordered.push(...resolve(g.teams));
      }
    }

    // ---- Qualification (points only, tie-breaks ignored) -------------------
    const remainingOf = (team) => {
      const total = fixtures.filter((f) => f.home === team || f.away === team).length;
      const playedCount = played.filter((m) => m.home === team || m.away === team).length;
      return total - playedCount;
    };
    const maxOf = (team) => pointsOf(team) + points.win * remainingOf(team);
    const qualStatus = (team) => {
      const pT = pointsOf(team);
      const others = teams.filter((t) => t !== team);
      const geMax = others.filter((x) => maxOf(x) >= pT).length;
      if (geMax < spots) return 'clinched';
      const gtPoints = others.filter((x) => pointsOf(x) > maxOf(team)).length;
      if (gtPoints >= spots) return 'eliminated';
      return 'still_possible';
    };

    // ---- Build table -------------------------------------------------------
    const table = ordered.map((entry, idx) => {
      const t = entry.id;
      const a = agg[t];
      return {
        rank: idx + 1,
        team_id: t,
        played: a.played,
        won: a.won,
        drawn: a.drawn,
        lost: a.lost,
        scored: a.scored,
        conceded: a.conceded,
        diff: diffOver(played, t),
        points: pointsOf(t),
        fair_play: a.fair_play,
        status: qualStatus(t),
        resolved_by: entry.sep,
      };
    });

    // ---- h2h (every ordered pair) ------------------------------------------
    const h2h = {};
    for (const a of teams) {
      h2h[a] = {};
      for (const b of teams) {
        if (a === b) continue;
        const ms = played.filter(
          (m) => (m.home === a && m.away === b) || (m.home === b && m.away === a)
        );
        let pl = 0, pts = 0, sc = 0, co = 0;
        for (const m of ms) {
          const r = sideResult(m, m.home === a);
          pl += 1;
          sc += r.myScore;
          co += r.oppScore;
          if (r.res === 'win') pts += points.win;
          else if (r.res === 'draw') pts += points.draw;
          else pts += points.loss;
        }
        h2h[a][b] = { played: pl, points: pts, scored: sc, conceded: co };
      }
    }

    return {
      league_id: leagueId,
      sport_id: sportId,
      qualification_spots: spots,
      table,
      h2h,
    };
  }
}

module.exports = {
  StandingsService,
};
