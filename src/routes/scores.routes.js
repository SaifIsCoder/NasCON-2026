'use strict';

/**
 * Score Projection Routes (Section 5.9)
 */

const express = require('express');
const { ScoresController } = require('../controllers/scores.controller');

const router = express.Router();

router.get('/audit/v1/score/:match_id', ScoresController.getScore);

module.exports = router;
