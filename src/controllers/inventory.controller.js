'use strict';

/**
 * Inventory Controller (Section 5.12)
 */

const { InventoryService } = require('../services/inventory.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class InventoryController {
  static async getInventory(req, res, next) {
    try {
      const result = await InventoryService.getInventory(req.params.variant_id);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  InventoryController,
};
