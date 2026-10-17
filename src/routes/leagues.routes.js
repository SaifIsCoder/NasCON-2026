'use strict';

/**
 * Leagues Setup Routes (Section 5.8)
 */

const express = require('express');
const { LeaguesController } = require('../controllers/leagues.controller');

const router = express.Router();

router.post('/audit/v1/leagues', LeaguesController.setupLeague);

module.exports = router;
