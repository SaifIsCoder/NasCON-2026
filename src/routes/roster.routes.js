'use strict';

/**
 * Roster & Player Registry Routes (Section 5.11)
 */

const express = require('express');
const { RosterController } = require('../controllers/roster.controller');

const router = express.Router();

router.post('/audit/v1/roster/setup', RosterController.setup);
router.post('/audit/v1/roster/transfer', RosterController.transfer);
router.get('/audit/v1/roster/history/:player_id', RosterController.getHistory);

module.exports = router;
