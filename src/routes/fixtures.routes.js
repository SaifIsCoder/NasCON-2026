'use strict';

/**
 * Fixtures Scheduling Routes (Section 5.7)
 */

const express = require('express');
const { FixturesController } = require('../controllers/fixtures.controller');

const router = express.Router();

router.post('/audit/v1/fixtures', FixturesController.generateFixtures);

module.exports = router;
