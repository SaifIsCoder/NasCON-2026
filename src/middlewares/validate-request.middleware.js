'use strict';

/**
 * Request Validation Middleware Helper
 * Wraps validator functions to execute seamlessly in Express routes.
 */

const { ApiError } = require('../utils/api-error');

function validateRequest(validatorFn) {
  return (req, res, next) => {
    try {
      if (typeof validatorFn === 'function') {
        const validated = validatorFn(req.body, req.params, req.query);
        if (validated && typeof validated === 'object') {
          req.validated = validated;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  validateRequest,
};
