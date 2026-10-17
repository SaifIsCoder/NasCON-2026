'use strict';

/**
 * System Reset Routes (Section 5.5)
 */

const express = require('express');
const { ResetController } = require('../controllers/reset.controller');

const router = express.Router();

router.post('/audit/v1/reset', ResetController.reset);

module.exports = router;
