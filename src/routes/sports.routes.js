'use strict';

/**
 * Sports Routes (Section 5.6)
 */

const express = require('express');
const { SportsController } = require('../controllers/sports.controller');

const router = express.Router();

router.post('/audit/v1/sports', SportsController.registerSport);
router.get('/audit/v1/sports', SportsController.getAllSports);

module.exports = router;
