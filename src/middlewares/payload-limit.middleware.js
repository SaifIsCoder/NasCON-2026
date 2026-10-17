'use strict';

/**
 * Payload Limit & JSON Parsing Middleware (Section 5.3)
 * Enforces 1 MB request limit and catches syntax errors in JSON bodies.
 */

const express = require('express');

const jsonBodyParser = express.json({ limit: '1mb' });

function handleBodyParsingErrors(err, req, res, next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds 1 MB limit.',
        details: {},
      },
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload.',
        details: {},
      },
    });
  }

  next(err);
}

module.exports = {
  jsonBodyParser,
  handleBodyParsingErrors,
};
