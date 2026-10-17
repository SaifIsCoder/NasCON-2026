'use strict';

/**
 * Merchandise Checkout Routes (Section 5.12)
 */

const express = require('express');
const { CheckoutController } = require('../controllers/checkout.controller');

const router = express.Router();

router.post('/audit/v1/checkout', CheckoutController.checkout);

module.exports = router;
