'use strict';

/**
 * Offline Sync Service (Section 5.14, NFR-4)
 * Replays actions a mobile device queued while offline and resolves
 * version conflicts per the exact conflict-resolution matrix. The whole
 * request is always answered HTTP 200; only a malformed envelope is 400.
 */

const db = require('../config/database');
const { OfflineSyncValidator } = require('../validators/offline-sync.validator');
const { EventsService } = require('./events.service');
const { RosterService } = require('./roster.service');
const { EventRepository } = require('../repositories/event.repository');
const { FixtureRepository } = require('../repositories/fixture.repository');
const { RosterScenarioRepository: Repo } = require('../repositories/roster-scenario.repository');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class OfflineSyncService {
  static async syncOfflineOperations(body) {
    const { device_id, actions } = OfflineSyncValidator.validateSyncBatch(body);

    // Processing order: sort by queued_at asc (ties: original array index)
    const indexed = actions.map((action, idx) => ({ action, idx }));
    const processingOrder = [...indexed].sort((a, b) => {
      const qa = a.action.queued_at || '';
      const qb = b.action.queued_at || '';
      if (qa < qb) return -1;
      if (qa > qb) return 1;
      return a.idx - b.idx;
    });

    const resultByIdx = new Array(actions.length);
    let processed = 0;

    for (const { action, idx } of processingOrder) {
      processed += 1;
      const res = await this.processAction(device_id, action);
      res.processed_order = processed;
      resultByIdx[idx] = res;
    }

    const results = resultByIdx; // request order
    const summary = { applied: 0, rejected: 0, duplicate: 0 };
    for (const r of results) {
      if (r.status === 'applied') summary.applied += 1;
      else if (r.status === 'rejected') summary.rejected += 1;
      else if (r.status === 'duplicate') summary.duplicate += 1;
    }

    return { device_id, results, summary };
  }

  static async processAction(deviceId, action) {
    const actionId = action.action_id;
    const type = action.type;
    const baseVersion = typeof action.base_version === 'number' ? action.base_version : 0;

    const base = { action_id: actionId };

    // (device_id, action_id) already processed before -> duplicate / skipped_duplicate
    const priorRow = await this.findProcessed(deviceId, actionId);
    if (priorRow) {
      const stored = typeof priorRow.result === 'string' ? JSON.parse(priorRow.result) : priorRow.result;
      return {
        ...base,
        status: 'duplicate',
        resolution: 'skipped_duplicate',
        error_code: null,
        server_version: stored.server_version != null ? stored.server_version : 0,
        signature: null,
      };
    }

    let result;
    if (type === 'score_event') {
      result = await this.processScoreEvent(action, baseVersion, base);
    } else if (type === 'roster_transfer') {
      result = await this.processRosterTransfer(action, baseVersion, base);
    } else {
      result = { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.VALIDATION_ERROR, server_version: 0, signature: null };
    }

    // Record for idempotent replay (change nothing on re-send)
    await this.recordProcessed(deviceId, actionId, result);
    return result;
  }

  static async processScoreEvent(action, baseVersion, base) {
    const payload = action.payload || {};
    const matchId = payload.match_id;

    const matchRow = matchId ? await FixtureRepository.findMatchById(matchId) : null;
    const isInit = payload.type === 'match_init';

    // Unknown id referenced -> *_NOT_FOUND
    if (!isInit && !matchRow) {
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.MATCH_NOT_FOUND, server_version: 0, signature: null };
    }

    const currentVersion = matchId ? await EventRepository.countByMatchId(matchId) : 0;

    // base_version > current version -> INVALID_BASE_VERSION
    if (baseVersion > currentVersion) {
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.INVALID_BASE_VERSION, server_version: currentVersion, signature: null };
    }

    try {
      const applied = await EventsService.appendEvent(payload);
      const afterVersion = await EventRepository.countByMatchId(matchId);
      if (applied.statusCode === 200) {
        // same event_id, identical payload already existed
        return { ...base, status: 'duplicate', resolution: 'skipped_duplicate', error_code: null, server_version: afterVersion, signature: null };
      }
      const resolution = baseVersion === currentVersion ? 'appended' : 'rebased_append';
      return { ...base, status: 'applied', resolution, error_code: null, server_version: afterVersion, signature: applied.data.signature };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ERROR_CODES.INTERNAL_ERROR;
      const afterVersion = matchId ? await EventRepository.countByMatchId(matchId) : 0;
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: code, server_version: afterVersion, signature: null };
    }
  }

  static async processRosterTransfer(action, baseVersion, base) {
    const payload = action.payload || {};
    const playerId = payload.player_id;

    const currentVersion = playerId ? await this.countPlayerAudit(playerId) : 0;

    // Unknown id referenced (league / player) -> *_NOT_FOUND
    const league = payload.league_id ? await Repo.findLeague(payload.league_id) : null;
    if (!league) {
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.LEAGUE_NOT_FOUND, server_version: currentVersion, signature: null };
    }
    const reg = playerId ? await Repo.findRegistration(payload.league_id, playerId) : null;
    if (!reg) {
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.PLAYER_NOT_FOUND, server_version: currentVersion, signature: null };
    }

    // base_version > current version -> INVALID_BASE_VERSION
    if (baseVersion > currentVersion) {
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: ERROR_CODES.INVALID_BASE_VERSION, server_version: currentVersion, signature: null };
    }

    try {
      const applied = await RosterService.transferPlayer(payload);
      const afterVersion = await this.countPlayerAudit(playerId);
      if (applied.statusCode === 200) {
        return { ...base, status: 'duplicate', resolution: 'skipped_duplicate', error_code: null, server_version: afterVersion, signature: null };
      }
      const resolution = baseVersion === currentVersion ? 'appended' : 'rebased_append';
      return { ...base, status: 'applied', resolution, error_code: null, server_version: afterVersion, signature: null };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ERROR_CODES.INTERNAL_ERROR;
      const afterVersion = await this.countPlayerAudit(playerId);
      return { ...base, status: 'rejected', resolution: 'server_wins', error_code: code, server_version: afterVersion, signature: null };
    }
  }

  // ---- helpers -------------------------------------------------------------
  static async countPlayerAudit(playerId) {
    const r = await db.query('SELECT COUNT(*)::int AS n FROM roster_audit WHERE player_id = $1', [playerId]);
    return r.rows[0].n;
  }

  static async findProcessed(deviceId, actionId) {
    const r = await db.query('SELECT * FROM offline_sync_actions WHERE device_id = $1 AND action_id = $2', [deviceId, actionId]);
    return r.rows[0] || null;
  }

  static async recordProcessed(deviceId, actionId, result) {
    await db.query(
      `INSERT INTO offline_sync_actions (device_id, action_id, result) VALUES ($1,$2,$3)
       ON CONFLICT (device_id, action_id) DO NOTHING`,
      [deviceId, actionId, JSON.stringify(result)]
    );
  }
}

module.exports = {
  OfflineSyncService,
};
