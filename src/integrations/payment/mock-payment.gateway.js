'use strict';

/**
 * Mock Payment Gateway Integration (Section 5.12)
 * Simulates synchronous payment authorization and capture.
 */

const { ApiError } = require('../../utils/api-error');
const { ERROR_CODES } = require('../../constants/error-codes.constants');

class MockPaymentGateway {
  /**
   * Process a payment token
   * @param {Object} paymentInfo
   * @param {string} paymentInfo.token
   * @param {number} totalMinor
   * @param {string} currency
   * @returns {Promise<Object>}
   */
  static async processPayment(paymentInfo, totalMinor, currency = 'PKR') {
    if (!paymentInfo || typeof paymentInfo.token !== 'string') {
      throw ApiError.badRequest('payment.token is required', { fields: ['payment.token'] });
    }

    const { token } = paymentInfo;

    if (token === 'tok_declined') {
      throw new ApiError(402, ERROR_CODES.PAYMENT_DECLINED, 'Payment was declined by the card issuer.');
    }

    if (token === 'tok_capture_fail') {
      throw new ApiError(402, ERROR_CODES.PAYMENT_CAPTURE_FAILED, 'Payment authorization succeeded but capture failed.');
    }

    if (token !== 'tok_success') {
      throw ApiError.badRequest(`Invalid payment token: ${token}`, { fields: ['payment.token'] });
    }

    const timestamp = Date.now();
    return {
      authorization_id: `auth_${timestamp}`,
      capture_id: `cap_${timestamp}`,
      state: 'captured',
      amount_minor: totalMinor,
      currency,
    };
  }
}

module.exports = {
  MockPaymentGateway,
};
