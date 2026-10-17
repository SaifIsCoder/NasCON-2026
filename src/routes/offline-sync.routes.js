'use strict';

/**
 * Offline Synchronization Routes (Section 5.14)
 */

const express = require('express');
const { OfflineSyncController } = require('../controllers/offline-sync.controller');

const router = express.Router();

router.post('/audit/v1/offline-sync', OfflineSyncController.sync);

module.exports = router;
