'use strict';

/**
 * Backward-Compatibility Bridge for Store & Checkout Module
 * Re-exports from src/services/checkout.service and src/services/inventory.service
 */

const { CheckoutService, generateReceiptPdfBase64 } = require('../../services/checkout.service');
const { InventoryService } = require('../../services/inventory.service');
const { ApiError } = require('../../utils/api-error');

class StoreError extends ApiError {
  constructor(statusCode, code, message, details = {}) {
    super(statusCode, code, message, details);
  }
}

module.exports = {
  processCheckout: CheckoutService.processCheckout.bind(CheckoutService),
  getInventory: InventoryService.getInventory.bind(InventoryService),
  generateReceiptPdfBase64,
  StoreError,
};
