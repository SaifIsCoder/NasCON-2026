'use strict';

/**
 * Health Routes (Section 5.4)
 */

const express = require('express');
const { HealthController } = require('../controllers/health.controller');

const router = express.Router();

router.get('/health', HealthController.getHealth);

module.exports = router;
