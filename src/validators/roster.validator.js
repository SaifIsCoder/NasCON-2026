'use strict';

/**
 * Roster Setup & Transfer Validator (Section 5.11)
 */

const { ApiError } = require('../utils/api-error');

class RosterValidator {
  static validateSetup(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }
    const { club_id, players } = body;
    if (!club_id || typeof club_id !== 'string') {
      throw ApiError.badRequest('club_id is required', { fields: ['club_id'] });
    }
    if (!Array.isArray(players)) {
      throw ApiError.badRequest('players must be an array', { fields: ['players'] });
    }
    return { club_id, players };
  }

  static validateTransfer(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }
    const { player_id, source_club_id, target_club_id, transfer_type } = body;
    if (!player_id || typeof player_id !== 'string') {
      throw ApiError.badRequest('player_id is required', { fields: ['player_id'] });
    }
    if (!target_club_id || typeof target_club_id !== 'string') {
      throw ApiError.badRequest('target_club_id is required', { fields: ['target_club_id'] });
    }
    if (!transfer_type || !['permanent', 'loan', 'release'].includes(transfer_type)) {
      throw ApiError.badRequest('transfer_type must be permanent, loan, or release', { fields: ['transfer_type'] });
    }
    return { player_id, source_club_id, target_club_id, transfer_type };
  }
}

module.exports = {
  RosterValidator,
};
