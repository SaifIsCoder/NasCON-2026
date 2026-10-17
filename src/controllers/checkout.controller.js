'use strict';

/**
 * Checkout Controller (Section 5.12)
 */

const { CheckoutService } = require('../services/checkout.service');

class CheckoutController {
  static async checkout(req, res, next) {
    try {
      const result = await CheckoutService.processCheckout(req.body);
      res.status(result.statusCode).json(result.data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  CheckoutController,
};
