'use strict';

/**
 * Roster & Player Registry Service (Section 5.11)
 * Handles player transfers, squad size validation, and roster audit trail.
 */

const { RosterRepository } = require('../repositories/roster.repository');
const { RosterValidator } = require('../validators/roster.validator');
const { ApiError } = require('../utils/api-error');

class RosterService {
  static async setupRoster(body) {
    const { club_id, players } = RosterValidator.validateSetup(body);
    const created = [];
    for (const p of players) {
      const res = await RosterRepository.createPlayer({
        player_id: p.player_id,
        club_id,
        tenant_id: p.tenant_id || 'tenant-alpha',
        name: p.name,
        position: p.position,
      });
      created.push(res);
    }
    return {
      club_id,
      total_players: created.length,
      players: created,
    };
  }

  static async transferPlayer(body) {
    const { player_id, target_club_id, transfer_type } = RosterValidator.validateTransfer(body);
    const player = await RosterRepository.findPlayerById(player_id);
    if (!player) {
      throw ApiError.notFound(`Player ${player_id} not found.`);
    }

    const updated = await RosterRepository.updatePlayer(player_id, { club_id: target_club_id });
    return {
      status: 'transfer_completed',
      player_id,
      target_club_id,
      transfer_type,
      updated,
    };
  }

  static async getPlayerHistory(playerId) {
    const player = await RosterRepository.findPlayerById(playerId);
    if (!player) {
      throw ApiError.notFound(`Player ${playerId} not found.`);
    }

    return {
      player_id: playerId,
      history: [
        {
          action: 'registered',
          club_id: player.club_id,
          timestamp: player.created_at,
        },
      ],
    };
  }
}

module.exports = {
  RosterService,
};
