'use strict';

/**
 * Match Event Sourcing Repository (Section 5.9)
 * Handles append-only log operations for `match_events`.
 */

const db = require('../config/database');

class EventRepository {
  static async query(text, params, client = null) {
    if (client) {
      return client.query(text, params);
    }
    return db.query(text, params);
  }

  static async findByEventId(eventId, client = null) {
    const res = await this.query('SELECT * FROM match_events WHERE event_id = $1', [eventId], client);
    return res.rows[0] || null;
  }

  static async findForUpdate(eventId, matchId, client) {
    const res = await this.query(
      'SELECT * FROM match_events WHERE event_id = $1 AND match_id = $2 FOR UPDATE',
      [eventId, matchId],
      client
    );
    return res.rows[0] || null;
  }

  static async findByMatchId(matchId, client = null) {
    const res = await this.query(
      `SELECT sequence, event_id, type, payload, signature, compensated, compensated_by, created_at
       FROM match_events 
       WHERE match_id = $1 
       ORDER BY sequence ASC`,
      [matchId],
      client
    );
    return res.rows;
  }

  static async findNextSequence(matchId, client = null) {
    const res = await this.query(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM match_events WHERE match_id = $1',
      [matchId],
      client
    );
    return parseInt(res.rows[0].next_seq, 10);
  }

  static async countByMatchId(matchId, client = null) {
    const res = await this.query('SELECT COUNT(*) AS total FROM match_events WHERE match_id = $1', [matchId], client);
    return parseInt(res.rows[0].total, 10);
  }

  static async countUpToSequence(matchId, sequence, client = null) {
    const res = await this.query(
      'SELECT COUNT(*) AS total FROM match_events WHERE match_id = $1 AND sequence <= $2',
      [matchId, sequence],
      client
    );
    return parseInt(res.rows[0].total, 10);
  }

  static async insertEvent(eventData, client = null) {
    const payloadJson = typeof eventData.payload === 'string' ? eventData.payload : JSON.stringify(eventData.payload);
    const rawBodyJson = typeof eventData.raw_body === 'string' ? eventData.raw_body : JSON.stringify(eventData.raw_body);

    const res = await this.query(
      `INSERT INTO match_events (
        event_id, match_id, type, sequence, payload, raw_body, signature, compensated, compensated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NULL)
      RETURNING id, event_id, match_id, type, sequence, signature, created_at`,
      [
        eventData.event_id,
        eventData.match_id,
        eventData.type,
        eventData.sequence,
        payloadJson,
        rawBodyJson,
        eventData.signature,
      ],
      client
    );
    return res.rows[0];
  }

  static async markCompensated(targetEventId, compensatingEventId, client = null) {
    const res = await this.query(
      `UPDATE match_events 
       SET compensated = TRUE, compensated_by = $1 
       WHERE event_id = $2 
       RETURNING event_id, compensated, compensated_by`,
      [compensatingEventId, targetEventId],
      client
    );
    return res.rows[0] || null;
  }

  static async deleteAll(client = null) {
    return this.query('DELETE FROM match_events', [], client);
  }
}

module.exports = {
  EventRepository,
};
