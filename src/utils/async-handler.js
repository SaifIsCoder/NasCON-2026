'use strict';

/**
 * Express Async Handler Wrapper
 * Catches unhandled Promise rejections and forwards them to the centralized error handler.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  asyncHandler,
};
