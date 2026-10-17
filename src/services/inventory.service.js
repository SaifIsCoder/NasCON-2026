'use strict';

/**
 * Inventory Query Service (Section 5.12)
 */

const { InventoryRepository } = require('../repositories/inventory.repository');
const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');

class InventoryService {
  /**
   * Query variant stock and reserved units
   * @param {string} variant_id
   * @returns {Promise<Object>}
   */
  static async getInventory(variant_id) {
    if (!variant_id || typeof variant_id !== 'string') {
      throw ApiError.badRequest('variant_id is required', { fields: ['variant_id'] });
    }

    const variant = await InventoryRepository.findVariantById(variant_id);
    if (!variant) {
      throw new ApiError(404, ERROR_CODES.VARIANT_NOT_FOUND, `Variant ${variant_id} does not exist.`);
    }

    return {
      variant_id: variant.variant_id,
      stock: variant.stock,
      reserved: variant.reserved,
    };
  }
}

module.exports = {
  InventoryService,
};
