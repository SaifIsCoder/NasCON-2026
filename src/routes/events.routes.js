'use strict';

/**
 * Match Event Sourcing Routes (Section 5.9)
 */

const express = require('express');
const { EventsController } = require('../controllers/events.controller');

const router = express.Router();

router.post('/audit/v1/events', EventsController.appendEvent);

module.exports = router;
