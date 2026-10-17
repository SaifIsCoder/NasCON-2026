'use strict';

/**
 * NaSCon '26 Express Application Factory
 * Configures middleware pipeline, central routes, and centralized error handling.
 */

const express = require('express');
const routes = require('./routes');
const { jsonBodyParser, handleBodyParsingErrors } = require('./middlewares/payload-limit.middleware');
const { rateLimiter } = require('./middlewares/rate-limit.middleware');
const { requestId } = require('./middlewares/request-id.middleware');
const { notFoundHandler } = require('./middlewares/not-found.middleware');
const { errorHandler } = require('./middlewares/error-handler.middleware');

const app = express();

// 1. Request ID tracking
app.use(requestId);

// 2. Section 5.3 & NFR-6: Rate limiting on /api/v1/* (exempts /health and /audit/v1/*)
app.use(rateLimiter);

// 3. Section 5.3: 1 MB payload limiter
app.use(jsonBodyParser);

// 4. Payload size violation and malformed JSON error handler
app.use(handleBodyParsingErrors);

// 5. Mount central API routes
app.use(routes);

// 6. Handle unmatched routes
app.use(notFoundHandler);

// 7. Centralized application error handling
app.use(errorHandler);

module.exports = app;
