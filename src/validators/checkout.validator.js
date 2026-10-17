'use strict';

/**
 * Merchandise Checkout Input Validator (Section 5.12)
 */

const { ApiError } = require('../utils/api-error');
const { ERROR_CODES } = require('../constants/error-codes.constants');
const { APP_CONSTANTS } = require('../constants/app.constants');

class CheckoutValidator {
  static validateCheckout(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { order_id, customer_id, items, discount_code, payment } = body;

    if (!order_id || typeof order_id !== 'string') {
      throw ApiError.badRequest('order_id is required', { fields: ['order_id'] });
    }
    if (!customer_id || typeof customer_id !== 'string') {
      throw ApiError.badRequest('customer_id is required', { fields: ['customer_id'] });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
      throw ApiError.badRequest('items must contain 1-10 items', { fields: ['items'] });
    }
    for (const item of items) {
      if (!item || !item.variant_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw ApiError.badRequest('Each item must have a variant_id and positive quantity', { fields: ['items'] });
      }
    }
    if (!payment || typeof payment.token !== 'string') {
      throw ApiError.badRequest('payment.token is required', { fields: ['payment.token'] });
    }

    if (discount_code !== null && discount_code !== undefined && discount_code !== APP_CONSTANTS.WELCOME_DISCOUNT_CODE) {
      throw new ApiError(400, ERROR_CODES.INVALID_DISCOUNT_CODE, `Unknown discount code: ${discount_code}`);
    }

    return {
      order_id,
      customer_id,
      items,
      discount_code,
      payment,
    };
  }
}

module.exports = {
  CheckoutValidator,
};
