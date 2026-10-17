'use strict';

/**
 * Standings Routes (Section 5.10)
 */

const express = require('express');
const { StandingsController } = require('../controllers/standings.controller');

const router = express.Router();

router.get('/audit/v1/standings/:league_id', StandingsController.getStandings);

module.exports = router;
