'use strict';

/**
 * Authentication & Rate-Limiting Probe Routes (Section 8.3 & Section 5.13)
 */

const express = require('express');
const { AuthController } = require('../controllers/auth.controller');

const router = express.Router();

router.post(['/api/v1/auth/login', '/auth/login'], AuthController.login);

// Rate-limiting test probe (Section 5.13)
router.get('/api/v1/ping', (req, res) => {
  res.status(200).json({ pong: true });
});

module.exports = router;
