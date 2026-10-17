'use strict';

/**
 * Match Event Sourcing Service (Section 5.9)
 * Manages append-only stream, state machine transitions, sequence calculation,
 * compensation events, and HMAC-SHA256 signatures.
 */

const { EventRepository } = require('../repositories/event.repository');
const { FixtureRepository } = require('../repositories/fixture.repository');
const { EventsValidator } = require('../validators/events.validator');
const { signEvent } = require('../utils/signature.util');
const { canonicalize } = require('../utils/canonical-json.util');
const { withTransaction } = require('../database/transactions');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class EventsService {
  /**
   * Appends an event to the immutable match stream.
   *
   * @param {Object} body - Request body
   * @returns {Promise<{ statusCode: number, data: Object }>}
   */
  static async appendEvent(body) {
    const { event_id, match_id, type, payload } = EventsValidator.validateAppendEvent(body);

    // 1. Idempotency Check
    const existing = await EventRepository.findByEventId(event_id);
    if (existing) {
      const incomingCanon = canonicalize(body);
      const existingCanon = canonicalize(existing.raw_body);

      if (incomingCanon === existingCanon) {
        // Replay of identical request -> return 200 with stored response
        const totalUpToSeq = await EventRepository.countUpToSequence(existing.match_id, existing.sequence);
        return {
          statusCode: 200,
          data: {
            event_id: existing.event_id,
            match_id: existing.match_id,
            type: existing.type,
            sequence: existing.sequence,
            match_version: totalUpToSeq,
            signature: existing.signature,
          },
        };
      } else {
        // Same id with different body -> 409 DUPLICATE_EVENT_ID
        throw new ApiError(409, ERROR_CODES.DUPLICATE_EVENT_ID, `Event ID ${event_id} already exists with a different body.`);
      }
    }

    // 2. Transactional Event Insertion
    return withTransaction(async (client) => {
      if (type === 'match_init') {
        const matchCheck = await FixtureRepository.findMatchByIdForUpdate(match_id, client);
        if (matchCheck) {
          throw new ApiError(409, ERROR_CODES.MATCH_EXISTS, `Match ${match_id} already exists.`);
        }

        const { sport_id, home_team_id, away_team_id, league_id } = payload;
        if (!sport_id || !home_team_id || !away_team_id) {
          throw ApiError.badRequest('match_init requires sport_id, home_team_id, away_team_id', {
            fields: ['sport_id', 'home_team_id', 'away_team_id'],
          });
        }

        await FixtureRepository.createMatch(
          {
            match_id,
            sport_id,
            league_id: league_id || null,
            home_team_id,
            away_team_id,
            status: 'upcoming',
          },
          client
        );
      } else {
        const match = await FixtureRepository.findMatchByIdForUpdate(match_id, client);
        if (!match) {
          throw new ApiError(404, ERROR_CODES.MATCH_NOT_FOUND, `Match ${match_id} does not exist.`);
        }

        if (type === 'match_start') {
          if (match.status !== 'upcoming') {
            throw new ApiError(409, ERROR_CODES.ILLEGAL_TRANSITION, `Cannot start match in status ${match.status}.`);
          }
          await FixtureRepository.updateMatchStatus(match_id, 'in_progress', client);
        } else if (type === 'match_end') {
          if (match.status !== 'in_progress') {
            throw new ApiError(409, ERROR_CODES.ILLEGAL_TRANSITION, `Cannot end match in status ${match.status}.`);
          }
          await FixtureRepository.updateMatchStatus(match_id, 'completed', client);
        } else if (type === 'score' || type === 'discipline' || type === 'tiebreak_winner') {
          if (match.status !== 'in_progress') {
            throw new ApiError(409, ERROR_CODES.MATCH_NOT_IN_PROGRESS, `Match is in status ${match.status}, not in_progress.`);
          }
        } else if (type === 'compensation') {
          const { compensates } = payload;
          if (!compensates) {
            throw ApiError.badRequest('compensation requires compensates field', { fields: ['compensates'] });
          }

          const targetEvent = await EventRepository.findForUpdate(compensates, match_id, client);
          if (!targetEvent) {
            throw new ApiError(404, ERROR_CODES.EVENT_NOT_FOUND, `Event ${compensates} not found in match ${match_id}.`);
          }
          if (targetEvent.compensated) {
            throw new ApiError(409, ERROR_CODES.INVALID_COMPENSATION, `Event ${compensates} is already compensated.`);
          }
          if (!['score', 'discipline', 'tiebreak_winner'].includes(targetEvent.type)) {
            throw new ApiError(409, ERROR_CODES.INVALID_COMPENSATION, `Cannot compensate event of type ${targetEvent.type}.`);
          }

          await EventRepository.markCompensated(compensates, event_id, client);
        }
      }

      // Calculate sequence
      const sequence = await EventRepository.findNextSequence(match_id, client);

      // Calculate HMAC-SHA256 signature
      const signature = signEvent(event_id, payload);

      // Append to immutable log
      await EventRepository.insertEvent(
        {
          event_id,
          match_id,
          type,
          sequence,
          payload,
          raw_body: body,
          signature,
        },
        client
      );

      // Calculate match version
      const match_version = await EventRepository.countByMatchId(match_id, client);

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
    });
  }
}

module.exports = {
  EventsService,
};
