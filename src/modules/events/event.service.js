'use strict';

/**
 * Match Event Sourcing Persistence Service (Section 5.9)
 * Handles append-only match events, sequence calculation, compensation, and HMAC-SHA256 signature generation.
 */

const db = require('../../db');
const { signEvent, canonicalize } = require('../../utils/signature');

class EventError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Appends a signed event to the match event log.
 * Enforces transaction safety, append-only history, and idempotency.
 *
 * @param {Object} body - Request body containing event_id, match_id, type, payload
 * @returns {Promise<Object>} { statusCode, data }
 */
async function appendEvent(body) {
  const { event_id, match_id, type, payload } = body;

  if (!event_id || typeof event_id !== 'string') {
    throw new EventError(400, 'VALIDATION_ERROR', 'event_id is required', { fields: ['event_id'] });
  }
  if (!match_id || typeof match_id !== 'string') {
    throw new EventError(400, 'VALIDATION_ERROR', 'match_id is required', { fields: ['match_id'] });
  }
  if (!type || typeof type !== 'string') {
    throw new EventError(400, 'VALIDATION_ERROR', 'type is required', { fields: ['type'] });
  }
  if (!payload || typeof payload !== 'object') {
    throw new EventError(400, 'VALIDATION_ERROR', 'payload must be an object', { fields: ['payload'] });
  }

  // 1. Idempotency check: see if event_id already exists
  const existingEventRes = await db.query(
    'SELECT * FROM match_events WHERE event_id = $1',
    [event_id]
  );

  if (existingEventRes.rows.length > 0) {
    const existing = existingEventRes.rows[0];
    const incomingCanon = canonicalize(body);
    const existingCanon = canonicalize(existing.raw_body);

    if (incomingCanon === existingCanon) {
      // Replay of identical request -> return 200 with stored response
      const versionRes = await db.query(
        'SELECT COUNT(*) FROM match_events WHERE match_id = $1 AND sequence <= $2',
        [existing.match_id, existing.sequence]
      );
      return {
        statusCode: 200,
        data: {
          event_id: existing.event_id,
          match_id: existing.match_id,
          type: existing.type,
          sequence: existing.sequence,
          match_version: parseInt(versionRes.rows[0].count, 10),
          signature: existing.signature,
        },
      };
    } else {
      // Same id with different body -> 409 DUPLICATE_EVENT_ID
      throw new EventError(409, 'DUPLICATE_EVENT_ID', `Event ID ${event_id} already exists with a different body.`);
    }
  }

  // 2. Transactional event appending
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Handle match stream state
    if (type === 'match_init') {
      const matchCheck = await client.query('SELECT * FROM matches WHERE match_id = $1 FOR UPDATE', [match_id]);
      if (matchCheck.rows.length > 0) {
        throw new EventError(409, 'MATCH_EXISTS', `Match ${match_id} already exists.`);
      }

      const { sport_id, home_team_id, away_team_id, league_id } = payload;
      if (!sport_id || !home_team_id || !away_team_id) {
        throw new EventError(400, 'VALIDATION_ERROR', 'match_init requires sport_id, home_team_id, away_team_id', {
          fields: ['sport_id', 'home_team_id', 'away_team_id'],
        });
      }

      await client.query(
        `INSERT INTO matches (match_id, sport_id, league_id, home_team_id, away_team_id, status)
         VALUES ($1, $2, $3, $4, $5, 'upcoming')`,
        [match_id, sport_id, league_id || null, home_team_id, away_team_id]
      );
    } else {
      // Existing match stream must exist
      const matchRes = await client.query('SELECT * FROM matches WHERE match_id = $1 FOR UPDATE', [match_id]);
      if (matchRes.rows.length === 0) {
        throw new EventError(404, 'MATCH_NOT_FOUND', `Match ${match_id} does not exist.`);
      }
      const match = matchRes.rows[0];

      if (type === 'match_start') {
        if (match.status !== 'upcoming') {
          throw new EventError(409, 'ILLEGAL_TRANSITION', `Cannot start match in status ${match.status}.`);
        }
        await client.query("UPDATE matches SET status = 'in_progress' WHERE match_id = $1", [match_id]);
      } else if (type === 'match_end') {
        if (match.status !== 'in_progress') {
          throw new EventError(409, 'ILLEGAL_TRANSITION', `Cannot end match in status ${match.status}.`);
        }
        await client.query("UPDATE matches SET status = 'completed' WHERE match_id = $1", [match_id]);
      } else if (type === 'score' || type === 'discipline' || type === 'tiebreak_winner') {
        if (match.status !== 'in_progress') {
          throw new EventError(409, 'MATCH_NOT_IN_PROGRESS', `Match is in status ${match.status}, not in_progress.`);
        }
      } else if (type === 'compensation') {
        const { compensates } = payload;
        if (!compensates) {
          throw new EventError(400, 'VALIDATION_ERROR', 'compensation requires compensates field', { fields: ['compensates'] });
        }

        const targetEventRes = await client.query(
          'SELECT * FROM match_events WHERE event_id = $1 AND match_id = $2 FOR UPDATE',
          [compensates, match_id]
        );

        if (targetEventRes.rows.length === 0) {
          throw new EventError(404, 'EVENT_NOT_FOUND', `Event ${compensates} not found in match ${match_id}.`);
        }

        const targetEvent = targetEventRes.rows[0];
        if (targetEvent.compensated) {
          throw new EventError(409, 'INVALID_COMPENSATION', `Event ${compensates} is already compensated.`);
        }
        if (!['score', 'discipline', 'tiebreak_winner'].includes(targetEvent.type)) {
          throw new EventError(409, 'INVALID_COMPENSATION', `Cannot compensate event of type ${targetEvent.type}.`);
        }

        // Mark target event as compensated
        await client.query(
          'UPDATE match_events SET compensated = TRUE, compensated_by = $1 WHERE event_id = $2',
          [event_id, compensates]
        );
      }
    }

    // Sequence calculation (1-based position in match log)
    const seqRes = await client.query(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM match_events WHERE match_id = $1',
      [match_id]
    );
    const sequence = parseInt(seqRes.rows[0].next_seq, 10);

    // Calculate HMAC-SHA256 signature using DAY1_SALT
    const signature = signEvent(event_id, payload);

    // Insert into append-only log
    await client.query(
      `INSERT INTO match_events (event_id, match_id, type, sequence, payload, raw_body, signature, compensated, compensated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NULL)`,
      [event_id, match_id, type, sequence, JSON.stringify(payload), JSON.stringify(body), signature]
    );

    // Count total events for match_version
    const verRes = await client.query('SELECT COUNT(*) FROM match_events WHERE match_id = $1', [match_id]);
    const match_version = parseInt(verRes.rows[0].count, 10);

    await client.query('COMMIT');

    return {
      statusCode: 201,
      data: {
        event_id,
        match_id,
        type,
        sequence,
        match_version,
        signature,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Rebuilds the score projection from the immutable append-only event log (Section 5.9).
 *
 * @param {string} match_id
 * @returns {Promise<Object>}
 */
async function getScore(match_id) {
  const matchRes = await db.query('SELECT * FROM matches WHERE match_id = $1', [match_id]);
  if (matchRes.rows.length === 0) {
    throw new EventError(404, 'MATCH_NOT_FOUND', `Match ${match_id} does not exist.`);
  }
  const match = matchRes.rows[0];

  const eventsRes = await db.query(
    'SELECT sequence, event_id, type, payload, signature, compensated, compensated_by FROM match_events WHERE match_id = $1 ORDER BY sequence ASC',
    [match_id]
  );

  return {
    match_id,
    sport_id: match.sport_id,
    league_id: match.league_id,
    status: match.status,
    events: eventsRes.rows,
  };
}

module.exports = {
  EventError,
  appendEvent,
  getScore,
};
