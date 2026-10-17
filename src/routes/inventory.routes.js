'use strict';

/**
 * Inventory Routes (Section 5.12)
 */

const express = require('express');
const { InventoryController } = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/audit/v1/inventory/:variant_id', InventoryController.getInventory);

module.exports = router;
