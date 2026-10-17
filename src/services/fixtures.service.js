'use strict';

/**
 * Fixture & Tournament Scheduling Service (Section 5.7)
 *
 * Pure computation: the endpoint stores nothing. Implements
 *   - round_robin  (circle method, legs, byes, withdrawals)
 *   - swiss        (one round per call, Buchholz standings, rematch-free min-weight pairing)
 *   - single_elim  (recursive seed order, byes, advancement, third-place)
 *   - double_elim  (winners + losers brackets, grand final, optional bracket reset)
 */

const { FixturesValidator } = require('../validators/fixtures.validator');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

// ---------------------------------------------------------------------------
// Shared bracket helpers
// ---------------------------------------------------------------------------

/** Next power of two >= n. */
function nextPowerOfTwo(n) {
  let b = 1;
  while (b < n) b *= 2;
  return b;
}

/** log2 of an exact power of two. */
function log2(n) {
  return Math.round(Math.log2(n));
}

/**
 * Recursive seed ordering. order(2) = [1,2]; order(2k) = for each s in order(k): [s, 2k+1-s].
 * order(8) = [1,8,4,5,2,7,3,6].
 */
function seedOrder(size) {
  let order = [1];
  let cur = 1;
  while (cur < size) {
    const k = cur;
    const next = [];
    for (const s of order) {
      next.push(s, 2 * k + 1 - s);
    }
    order = next;
    cur *= 2;
  }
  return order;
}

// ---------------------------------------------------------------------------
// A) ROUND ROBIN
// ---------------------------------------------------------------------------

/**
 * Circle method schedule for one leg.
 * @returns {Array<Array<[string|null, string|null]>>} rounds -> list of [home, away] pairs
 *          (null represents the bye slot for odd team counts)
 */
function circleMethodLeg(teams) {
  const even = teams.length % 2 === 0;
  const slots = even ? [...teams] : [...teams, null];
  const m = slots.length;
  const roundsPerLeg = m - 1;
  const half = m / 2;

  const rounds = [];
  let list = [...slots];
  for (let r = 0; r < roundsPerLeg; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      pairs.push([list[i], list[m - 1 - i]]);
    }
    rounds.push(pairs);
    // Rotate: keep index 0 fixed, rotate the rest clockwise.
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }
  return rounds;
}

function generateRoundRobin(teams, params) {
  const n = teams.length;
  const legs = params.legs === undefined ? 1 : params.legs;
  if (legs !== 1 && legs !== 2) {
    throw ApiError.badRequest('legs must be 1 or 2', { fields: ['params.legs'] });
  }

  const withdrawalPolicy = params.withdrawal_policy === undefined ? 'forfeit_remaining' : params.withdrawal_policy;
  if (!['void_all', 'forfeit_remaining'].includes(withdrawalPolicy)) {
    throw ApiError.badRequest('withdrawal_policy must be void_all or forfeit_remaining', {
      fields: ['params.withdrawal_policy'],
    });
  }

  const leg1 = circleMethodLeg(teams);
  const roundsPerLeg = leg1.length;
  const roundCount = legs * roundsPerLeg;

  // Build the full round list with balanced home/away assignment.
  // Leg 1 uses a greedy balance; leg 2 mirrors leg 1 (home/away swapped) so that
  // every ordered (home, away) pair occurs exactly once across the two legs.
  const homeCount = Object.fromEntries(teams.map((t) => [t, 0]));
  const awayCount = Object.fromEntries(teams.map((t) => [t, 0]));

  const rounds = [];

  // Leg 1: greedy home/away balance.
  leg1.forEach((pairs, idx) => {
    const globalRound = idx + 1;
    const matches = [];
    let byeTeam = null;
    let matchIndex = 0;
    for (const [a, b] of pairs) {
      if (a === null || b === null) {
        byeTeam = a === null ? b : a;
        continue;
      }
      matchIndex += 1;
      let home;
      let away;
      const aNeedsHome = homeCount[a] - awayCount[a];
      const bNeedsHome = homeCount[b] - awayCount[b];
      if (aNeedsHome < bNeedsHome) {
        home = a;
        away = b;
      } else if (bNeedsHome < aNeedsHome) {
        home = b;
        away = a;
      } else {
        // Tie-break: team appearing earlier in the input is home.
        home = teams.indexOf(a) <= teams.indexOf(b) ? a : b;
        away = home === a ? b : a;
      }
      homeCount[home] += 1;
      awayCount[away] += 1;
      matches.push({
        match_id: `RR-L1-R${globalRound}-M${matchIndex}`,
        leg: 1,
        home,
        away,
        status: 'scheduled',
        awarded_to: null,
      });
    }
    rounds.push({ round: globalRound, matches, byes: byeTeam === null ? [] : [byeTeam] });
  });

  // Leg 2: mirror leg 1's actual orientation (swap home/away) so every ordered pair occurs once.
  if (legs === 2) {
    const leg1Rounds = rounds.slice();
    leg1Rounds.forEach((roundObj, idx) => {
      const globalRound = roundsPerLeg + idx + 1;
      const matches = roundObj.matches.map((m, mi) => ({
        match_id: `RR-L2-R${globalRound}-M${mi + 1}`,
        leg: 2,
        home: m.away,
        away: m.home,
        status: 'scheduled',
        awarded_to: null,
      }));
      rounds.push({ round: globalRound, matches, byes: [...roundObj.byes] });
    });
  }

  // Withdrawals
  const withdrawals = params.withdrawals === undefined ? [] : params.withdrawals;
  if (!Array.isArray(withdrawals)) {
    throw ApiError.badRequest('withdrawals must be an array', { fields: ['params.withdrawals'] });
  }
  const teamSet = new Set(teams);
  const afterRoundByTeam = new Map();
  for (const w of withdrawals) {
    if (!w || typeof w !== 'object' || !teamSet.has(w.team_id)) {
      throw ApiError.badRequest('withdrawal references an unknown team', { fields: ['params.withdrawals'] });
    }
    if (!Number.isInteger(w.after_round) || w.after_round < 0 || w.after_round > roundCount) {
      throw ApiError.badRequest(`after_round must be an integer within 0..${roundCount}`, {
        fields: ['params.withdrawals'],
      });
    }
    afterRoundByTeam.set(w.team_id, w.after_round);
  }

  const summary = { total: 0, scheduled: 0, forfeit: 0, voided: 0 };
  for (const roundObj of rounds) {
    for (const match of roundObj.matches) {
      summary.total += 1;
      const homeWd = afterRoundByTeam.has(match.home);
      const awayWd = afterRoundByTeam.has(match.away);

      if (withdrawalPolicy === 'void_all') {
        if (homeWd || awayWd) {
          match.status = 'voided';
          match.awarded_to = null;
        }
      } else {
        // forfeit_remaining
        const homeActive = homeWd && roundObj.round > afterRoundByTeam.get(match.home);
        const awayActive = awayWd && roundObj.round > afterRoundByTeam.get(match.away);
        if (homeActive && awayActive) {
          match.status = 'voided';
          match.awarded_to = null;
        } else if (homeActive) {
          match.status = 'forfeit';
          match.awarded_to = match.away;
        } else if (awayActive) {
          match.status = 'forfeit';
          match.awarded_to = match.home;
        }
      }
      summary[match.status] += 1;
    }
  }

  return {
    format: 'round_robin',
    legs,
    team_count: n,
    round_count: roundCount,
    rounds,
    summary,
  };
}

// ---------------------------------------------------------------------------
// B) SWISS
// ---------------------------------------------------------------------------

function computeSwissStandings(teams, history) {
  const score = Object.fromEntries(teams.map((t) => [t, 0]));
  const opponents = Object.fromEntries(teams.map((t) => [t, []]));
  const hadBye = Object.fromEntries(teams.map((t) => [t, false]));
  const met = new Set(); // "a|b" unordered keys of teams that have played

  for (const h of history) {
    if (h.bye !== undefined && h.bye !== null) {
      score[h.bye] += 1;
      hadBye[h.bye] = true;
    }
    for (const m of h.matches || []) {
      opponents[m.home].push(m.away);
      opponents[m.away].push(m.home);
      const key = [m.home, m.away].sort().join('|');
      met.add(key);
      if (m.result === 'home') {
        score[m.home] += 1;
      } else if (m.result === 'away') {
        score[m.away] += 1;
      } else if (m.result === 'draw') {
        score[m.home] += 0.5;
        score[m.away] += 0.5;
      }
    }
  }

  const buchholz = Object.fromEntries(teams.map((t) => [t, 0]));
  for (const t of teams) {
    buchholz[t] = opponents[t].reduce((sum, opp) => sum + score[opp], 0);
  }

  const seedIndex = Object.fromEntries(teams.map((t, i) => [t, i]));
  const ordered = [...teams].sort((a, b) => {
    if (score[b] !== score[a]) return score[b] - score[a];
    if (buchholz[b] !== buchholz[a]) return buchholz[b] - buchholz[a];
    return seedIndex[a] - seedIndex[b];
  });

  const standings = ordered.map((t, i) => ({
    rank: i + 1,
    team_id: t,
    score: score[t],
    buchholz: buchholz[t],
  }));

  return { standings, score, buchholz, met, hadBye, seedIndex, ordered };
}

/**
 * Minimum total |score difference| rematch-free perfect matching over `pool`
 * (even length). Returns an array of [a, b] pairs, or null if impossible.
 */
function minWeightPairing(pool, scoreOf, hasMet) {
  let best = null;
  let bestWeight = Infinity;

  const recurse = (remaining, acc, weight) => {
    if (weight >= bestWeight) return; // branch-and-bound
    if (remaining.length === 0) {
      best = acc.slice();
      bestWeight = weight;
      return;
    }
    const a = remaining[0];
    for (let i = 1; i < remaining.length; i++) {
      const b = remaining[i];
      if (hasMet(a, b)) continue;
      const rest = remaining.filter((_, idx) => idx !== 0 && idx !== i);
      acc.push([a, b]);
      recurse(rest, acc, weight + Math.abs(scoreOf(a) - scoreOf(b)));
      acc.pop();
    }
  };

  recurse(pool, [], 0);
  return best;
}

function generateSwiss(teams, params) {
  const n = teams.length;
  const totalRounds = params.total_rounds === undefined ? Math.floor(Math.log2(n)) : params.total_rounds;
  if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > n - 1) {
    throw ApiError.badRequest(`total_rounds must be an integer within 1..${n - 1}`, {
      fields: ['params.total_rounds'],
    });
  }
  const round = params.round === undefined ? 1 : params.round;
  if (!Number.isInteger(round) || round < 1 || round > totalRounds) {
    throw ApiError.badRequest(`round must be an integer within 1..${totalRounds}`, { fields: ['params.round'] });
  }

  const history = params.history === undefined ? [] : params.history;
  if (!Array.isArray(history)) {
    throw ApiError.badRequest('history must be an array', { fields: ['params.history'] });
  }
  const historyRounds = history.map((h) => h.round).sort((a, b) => a - b);
  const expected = [];
  for (let r = 1; r < round; r++) expected.push(r);
  if (historyRounds.length !== expected.length || expected.some((r, i) => historyRounds[i] !== r)) {
    throw ApiError.badRequest(`history must contain exactly rounds 1..${round - 1}`, { fields: ['params.history'] });
  }

  const { standings, score, met, hadBye, seedIndex, ordered } = computeSwissStandings(teams, history);
  const hasMet = (a, b) => met.has([a, b].sort().join('|'));

  // Round 1: exact pairing.
  let bye = null;
  let pairsOrdered;
  if (round === 1) {
    const m = Math.floor(n / 2);
    if (n % 2 === 1) {
      bye = teams[n - 1]; // last seed
    }
    pairsOrdered = [];
    for (let i = 1; i <= m; i++) {
      const home = teams[i - 1]; // lower seed number
      const away = teams[i - 1 + m];
      pairsOrdered.push([home, away]);
    }
  } else {
    // Rounds >= 2: choose bye (if odd) then a rematch-free min-weight pairing.
    let pairing = null;
    if (n % 2 === 0) {
      pairing = minWeightPairing(ordered, (t) => score[t], hasMet);
      if (!pairing) {
        throw new ApiError(409, ERROR_CODES.NO_VALID_PAIRING, `No valid Swiss pairing exists for round ${round}.`, {
          round,
        });
      }
    } else {
      // Bye candidates: lowest score first, then lowest seed (largest index) first.
      const candidates = teams
        .filter((t) => !hadBye[t])
        .sort((a, b) => {
          if (score[a] !== score[b]) return score[a] - score[b];
          return seedIndex[b] - seedIndex[a];
        });
      for (const cand of candidates) {
        const pool = ordered.filter((t) => t !== cand);
        const attempt = minWeightPairing(pool, (t) => score[t], hasMet);
        if (attempt) {
          bye = cand;
          pairing = attempt;
          break;
        }
      }
      if (!pairing) {
        throw new ApiError(409, ERROR_CODES.NO_VALID_PAIRING, `No valid Swiss pairing exists for round ${round}.`, {
          round,
        });
      }
    }
    // Deterministic output order: by the better-standing team of each pair.
    const rankOf = Object.fromEntries(standings.map((s) => [s.team_id, s.rank]));
    pairsOrdered = pairing
      .map(([a, b]) => (rankOf[a] <= rankOf[b] ? [a, b] : [b, a]))
      .sort((p1, p2) => rankOf[p1[0]] - rankOf[p2[0]]);
  }

  const pairings = pairsOrdered.map(([home, away], i) => ({
    match_id: `SW-R${round}-M${i + 1}`,
    home,
    away,
  }));

  return {
    format: 'swiss',
    round,
    total_rounds: totalRounds,
    pairings,
    bye,
    standings,
  };
}

// ---------------------------------------------------------------------------
// C) SINGLE ELIMINATION
// ---------------------------------------------------------------------------

function newMatch(matchId, bracket, round, index) {
  return {
    match_id: matchId,
    bracket,
    round,
    index,
    home: null,
    away: null,
    home_seed: null,
    away_seed: null,
    bye: false,
    winner: null,
    loser: null,
    winner_to: null,
    loser_to: null,
  };
}

/** Place a team (with its seed) into a target match slot. */
function placeTeam(matchMap, target, teamId, seed) {
  if (!target) return;
  const m = matchMap.get(target.match_id);
  if (!m) return;
  if (target.slot === 'home') {
    m.home = teamId;
    m.home_seed = seed === undefined ? null : seed;
  } else {
    m.away = teamId;
    m.away_seed = seed === undefined ? null : seed;
  }
}

/** Record a match result and propagate winner/loser along the wiring. */
function applyResult(matchMap, seedOf, match, winnerId) {
  const participants = [match.home, match.away].filter((t) => t !== null);
  if (!participants.includes(winnerId)) {
    throw ApiError.badRequest(`winner ${winnerId} is not a participant of ${match.match_id}`, {
      fields: ['params.results'],
    });
  }
  const loserId = match.home === winnerId ? match.away : match.home;
  match.winner = winnerId;
  match.loser = loserId;
  if (match.winner_to) placeTeam(matchMap, match.winner_to, winnerId, seedOf(winnerId));
  if (match.loser_to && loserId !== null) placeTeam(matchMap, match.loser_to, loserId, seedOf(loserId));
}

function buildSingleElimStructure(teams, params) {
  const n = teams.length;
  const B = nextPowerOfTwo(n);
  const rounds = log2(B);
  const order = seedOrder(B);
  const seedToTeam = (s) => (s <= n ? teams[s - 1] : null);
  const seedOfTeam = Object.fromEntries(teams.map((t, i) => [t, i + 1]));
  const seedOf = (t) => (t == null ? null : seedOfTeam[t]);

  const matchMap = new Map();
  const roundMatches = []; // roundMatches[r-1] = array of matches

  for (let r = 1; r <= rounds; r++) {
    const count = B / Math.pow(2, r);
    const arr = [];
    for (let i = 1; i <= count; i++) {
      const m = newMatch(`R${r}M${i}`, 'main', r, i);
      arr.push(m);
      matchMap.set(m.match_id, m);
    }
    roundMatches.push(arr);
  }

  // Wire advancement (winner_to) for every non-final match.
  for (let r = 1; r < rounds; r++) {
    for (const m of roundMatches[r - 1]) {
      const targetIndex = Math.ceil(m.index / 2);
      m.winner_to = { match_id: `R${r + 1}M${targetIndex}`, slot: m.index % 2 === 1 ? 'home' : 'away' };
    }
  }

  // Third-place match wiring (semifinal losers).
  const thirdPlace = params.third_place_match === true && rounds >= 2;
  let tpMatch = null;
  if (thirdPlace) {
    tpMatch = newMatch('TP', 'third_place', rounds, 2);
    matchMap.set('TP', tpMatch);
    const semis = roundMatches[rounds - 2];
    if (semis[0]) semis[0].loser_to = { match_id: 'TP', slot: 'home' };
    if (semis[1]) semis[1].loser_to = { match_id: 'TP', slot: 'away' };
  }

  // Seed round 1 and resolve byes immediately.
  const r1 = roundMatches[0];
  for (let i = 1; i <= r1.length; i++) {
    const m = r1[i - 1];
    const sTop = order[2 * i - 2];
    const sBot = order[2 * i - 1];
    const tTop = seedToTeam(sTop);
    const tBot = seedToTeam(sBot);

    if (tTop !== null && tBot !== null) {
      // lower seed number is home
      if (sTop <= sBot) {
        m.home = tTop;
        m.home_seed = sTop;
        m.away = tBot;
        m.away_seed = sBot;
      } else {
        m.home = tBot;
        m.home_seed = sBot;
        m.away = tTop;
        m.away_seed = sTop;
      }
    } else {
      // Bye: present team is home, missing side null.
      const present = tTop !== null ? tTop : tBot;
      const presentSeed = tTop !== null ? sTop : sBot;
      m.home = present;
      m.home_seed = presentSeed;
      m.away = null;
      m.away_seed = null;
      m.bye = true;
      m.winner = present;
      m.loser = null;
      if (m.winner_to) placeTeam(matchMap, m.winner_to, present, presentSeed);
    }
  }

  return { B, rounds, roundMatches, matchMap, seedOf, tpMatch };
}

function generateSingleElim(teams, params) {
  const { B, roundMatches, matchMap, seedOf, tpMatch } = buildSingleElimStructure(teams, params);

  const results = params.results === undefined ? [] : params.results;
  if (!Array.isArray(results)) {
    throw ApiError.badRequest('results must be an array', { fields: ['params.results'] });
  }
  for (const r of results) {
    if (!r || typeof r !== 'object' || typeof r.match_id !== 'string') {
      throw ApiError.badRequest('each result needs a match_id and winner', { fields: ['params.results'] });
    }
    const match = matchMap.get(r.match_id);
    if (!match) {
      throw ApiError.badRequest(`unknown match_id ${r.match_id}`, { fields: ['params.results'] });
    }
    applyResult(matchMap, seedOf, match, r.winner);
  }

  const out = roundMatches.map((arr, idx) => ({ round: idx + 1, matches: arr }));
  if (tpMatch) {
    out[out.length - 1].matches.push(tpMatch);
  }

  return { format: 'single_elim', bracket_size: B, rounds: out };
}

// ---------------------------------------------------------------------------
// D) DOUBLE ELIMINATION
// ---------------------------------------------------------------------------

function generateDoubleElim(teams, params) {
  const n = teams.length;
  const B = nextPowerOfTwo(n);
  const k = log2(B);
  const order = seedOrder(B);
  const seedToTeam = (s) => (s <= n ? teams[s - 1] : null);
  const seedOfTeam = Object.fromEntries(teams.map((t, i) => [t, i + 1]));
  const seedOf = (t) => (t == null ? null : seedOfTeam[t]);
  const bracketReset = params.bracket_reset === true;

  const matchMap = new Map();

  // Winners bracket: WR{r}M{i}, r=1..k, round r has B/2^r matches.
  const winners = [];
  for (let r = 1; r <= k; r++) {
    const count = B / Math.pow(2, r);
    const arr = [];
    for (let i = 1; i <= count; i++) {
      const m = newMatch(`WR${r}M${i}`, 'winners', r, i);
      arr.push(m);
      matchMap.set(m.match_id, m);
    }
    winners.push(arr);
  }

  // Losers bracket: LR{r}M{i}, r=1..2(k-1); rounds 2j-1 and 2j have B/2^{j+1} matches.
  const losers = [];
  const loserRoundCount = 2 * (k - 1);
  for (let r = 1; r <= loserRoundCount; r++) {
    const j = Math.ceil(r / 2);
    const count = B / Math.pow(2, j + 1);
    const arr = [];
    for (let i = 1; i <= count; i++) {
      const m = newMatch(`LR${r}M${i}`, 'losers', r, i);
      arr.push(m);
      matchMap.set(m.match_id, m);
    }
    losers.push(arr);
  }

  // Grand final.
  const gf1 = newMatch('GF1', 'grand_final', 1, 1);
  matchMap.set('GF1', gf1);
  let gf2 = null;
  if (bracketReset) {
    gf2 = newMatch('GF2', 'grand_final', 2, 2);
    gf2.conditional = true;
    gf2.required = null;
    matchMap.set('GF2', gf2);
  }

  const lr = (r) => losers[r - 1]; // 1-based accessor

  // --- Wire winners bracket ---
  for (let r = 1; r <= k; r++) {
    for (const m of winners[r - 1]) {
      // winner advancement
      if (r < k) {
        m.winner_to = {
          match_id: `WR${r + 1}M${Math.ceil(m.index / 2)}`,
          slot: m.index % 2 === 1 ? 'home' : 'away',
        };
      } else {
        m.winner_to = { match_id: 'GF1', slot: 'home' }; // WR final winner -> GF1.home
      }
      // loser drop into losers bracket
      if (r === 1) {
        m.loser_to = { match_id: `LR1M${Math.ceil(m.index / 2)}`, slot: m.index % 2 === 1 ? 'home' : 'away' };
      } else {
        // WR r (r>=2) losers drop into LR(2r-2), one-to-one, away slot.
        m.loser_to = { match_id: `LR${2 * r - 2}M${m.index}`, slot: 'away' };
      }
    }
  }

  // --- Wire losers bracket ---
  for (let r = 1; r <= loserRoundCount; r++) {
    for (const m of lr(r)) {
      m.loser_to = null; // eliminated
      if (r % 2 === 1) {
        // odd round 2j-1 -> winner into even round 2j, home slot (one-to-one)
        m.winner_to = { match_id: `LR${r + 1}M${m.index}`, slot: 'home' };
      } else if (r < loserRoundCount) {
        // even round 2j -> winner consolidates into next odd round 2j+1
        m.winner_to = { match_id: `LR${r + 1}M${Math.ceil(m.index / 2)}`, slot: m.index % 2 === 1 ? 'home' : 'away' };
      } else {
        // LB final winner -> GF1.away
        m.winner_to = { match_id: 'GF1', slot: 'away' };
      }
    }
  }

  // --- Grand final wiring ---
  gf1.winner_to = null;
  gf1.loser_to = null;

  // Seed winners round 1 and resolve byes (identical to single elim).
  const wr1 = winners[0];
  for (let i = 1; i <= wr1.length; i++) {
    const m = wr1[i - 1];
    const sTop = order[2 * i - 2];
    const sBot = order[2 * i - 1];
    const tTop = seedToTeam(sTop);
    const tBot = seedToTeam(sBot);
    if (tTop !== null && tBot !== null) {
      if (sTop <= sBot) {
        m.home = tTop;
        m.home_seed = sTop;
        m.away = tBot;
        m.away_seed = sBot;
      } else {
        m.home = tBot;
        m.home_seed = sBot;
        m.away = tTop;
        m.away_seed = sTop;
      }
    } else {
      const present = tTop !== null ? tTop : tBot;
      const presentSeed = tTop !== null ? sTop : sBot;
      m.home = present;
      m.home_seed = presentSeed;
      m.bye = true;
      m.winner = present;
      if (m.winner_to) placeTeam(matchMap, m.winner_to, present, presentSeed);
      // byes produce no loser flowing into the losers bracket
    }
  }

  // Apply results.
  const results = params.results === undefined ? [] : params.results;
  if (!Array.isArray(results)) {
    throw ApiError.badRequest('results must be an array', { fields: ['params.results'] });
  }
  for (const r of results) {
    if (!r || typeof r !== 'object' || typeof r.match_id !== 'string') {
      throw ApiError.badRequest('each result needs a match_id and winner', { fields: ['params.results'] });
    }
    const match = matchMap.get(r.match_id);
    if (!match) {
      throw ApiError.badRequest(`unknown match_id ${r.match_id}`, { fields: ['params.results'] });
    }
    applyResult(matchMap, seedOf, match, r.winner);

    if (match.match_id === 'GF1' && gf2) {
      // GF2 carries the same two teams; required becomes known once GF1 is decided.
      gf2.home = gf1.home;
      gf2.home_seed = gf1.home_seed;
      gf2.away = gf1.away;
      gf2.away_seed = gf1.away_seed;
      gf2.required = bracketReset && gf1.winner === gf1.away; // LB champion won GF1
    }
  }

  const winnersOut = winners.map((arr, idx) => ({ round: idx + 1, matches: arr }));
  const losersOut = losers.map((arr, idx) => ({ round: idx + 1, matches: arr }));
  const grandFinal = gf2 ? [gf1, gf2] : [gf1];

  return {
    format: 'double_elim',
    bracket_size: B,
    bracket_reset: bracketReset,
    winners: winnersOut,
    losers: losersOut,
    grand_final: grandFinal,
  };
}

// ---------------------------------------------------------------------------
// Service entry point
// ---------------------------------------------------------------------------

class FixturesService {
  /**
   * Generate fixtures for a tournament format (pure computation; stores nothing).
   * @param {Object} body - { format, teams, params }
   * @returns {Promise<Object>}
   */
  static async generateFixtures(body) {
    const { format, teams, params } = FixturesValidator.validateFixtureGeneration(body);

    switch (format) {
      case 'round_robin':
        return generateRoundRobin(teams, params);
      case 'swiss':
        return generateSwiss(teams, params);
      case 'single_elim':
        return generateSingleElim(teams, params);
      case 'double_elim':
        return generateDoubleElim(teams, params);
      default:
        throw ApiError.badRequest('Unsupported format', { fields: ['format'] });
    }
  }
}

module.exports = {
  FixturesService,
  // Exported for unit tests
  seedOrder,
  nextPowerOfTwo,
};
