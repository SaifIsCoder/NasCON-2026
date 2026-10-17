'use strict';

/**
 * Offline Sync Controller (Section 5.14)
 */

const { OfflineSyncService } = require('../services/offline-sync.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class OfflineSyncController {
  static async sync(req, res, next) {
    try {
      const result = await OfflineSyncService.syncOfflineOperations(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  OfflineSyncController,
};
