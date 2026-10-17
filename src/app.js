'use strict';

/**
 * NaSCon '26 Express Application
 * Configures REST API routes, middleware, and centralized error handling.
 */

const express = require('express');
const { appendEvent, getScore } = require('./modules/events/event.service');
const { processCheckout, getInventory } = require('./modules/store/checkout.service');
const { checkHealth, performReset } = require('./modules/system/system.service');
const { login, getRbacMatrix, authorizeProbe } = require('./modules/auth/auth.service');
const { authenticate, requireRole, requireTenantIsolation } = require('./middleware/auth');

const app = express();

// Section 5.3: Reject bodies larger than 1 MB with 413 PAYLOAD_TOO_LARGE
app.use(express.json({ limit: '1mb' }));

// Handle JSON parsing errors and payload size violations
app.use((err, req, res, next) => {
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
});

// Section 5.4: Readiness probe (no auth)
// Returns 200 {"status":"ok"} only when database is reachable and baseline data is seeded
app.get('/health', async (req, res) => {
  try {
    const health = await checkHealth();
    if (!health.healthy) {
      return res.status(503).json({
        status: 'error',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database is unreachable or baseline data is not seeded.',
          details: {},
        },
      });
    }
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is unreachable or baseline data is not seeded.',
        details: {},
      },
    });
  }
});

// Section 5.5: Audit Baseline Reset Endpoint
app.post('/audit/v1/reset', async (req, res, next) => {
  try {
    const result = await performReset(req.body || {});
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Section 5.9: Match Event Sourcing Endpoints
app.post('/audit/v1/events', async (req, res, next) => {
  try {
    const result = await appendEvent(req.body);
    res.status(result.statusCode).json(result.data);
  } catch (err) {
    next(err);
  }
});

app.get('/audit/v1/score/:match_id', async (req, res, next) => {
  try {
    const result = await getScore(req.params.match_id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Section 5.12: Merchandise Checkout & Inventory Endpoints
app.post('/audit/v1/checkout', async (req, res, next) => {
  try {
    const result = await processCheckout(req.body);
    res.status(result.statusCode).json(result.data);
  } catch (err) {
    next(err);
  }
});

app.get('/audit/v1/inventory/:variant_id', async (req, res, next) => {
  try {
    const result = await getInventory(req.params.variant_id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Authentication / Login Endpoints (Section 8.3)
app.post(['/api/v1/auth/login', '/auth/login'], async (req, res, next) => {
  try {
    const result = await login(req.body || {});
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Section 5.13: Mandatory Autograder RBAC Matrix Endpoint
app.post('/audit/v1/rbac-matrix', async (req, res, next) => {
  try {
    const matrix = await getRbacMatrix();
    res.status(200).json(matrix);
  } catch (err) {
    next(err);
  }
});

// Section 5.13: Authorization Probe Routes (P1 - P7)
// P1: POST /audit/v1/rbac/tenants
app.post('/audit/v1/rbac/tenants', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P1', req.user);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P2: POST /audit/v1/rbac/leagues/:league_id/fixtures
app.post('/audit/v1/rbac/leagues/:league_id/fixtures', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P2', req.user, req.params);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P3: POST /audit/v1/rbac/clubs/:club_id/roster
app.post('/audit/v1/rbac/clubs/:club_id/roster', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P3', req.user, req.params);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P4: POST /audit/v1/rbac/clubs/:club_id/products
app.post('/audit/v1/rbac/clubs/:club_id/products', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P4', req.user, req.params);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P5: PATCH /audit/v1/rbac/players/:player_id
app.patch('/audit/v1/rbac/players/:player_id', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P5', req.user, req.params);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P6: GET /audit/v1/rbac/clubs/:club_id
app.get('/audit/v1/rbac/clubs/:club_id', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P6', req.user, req.params);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// P7: GET /audit/v1/rbac/platform/config
app.get('/audit/v1/rbac/platform/config', authenticate, async (req, res, next) => {
  try {
    await authorizeProbe('P7', req.user);
    res.status(200).json({ authorized: true });
  } catch (err) {
    next(err);
  }
});

// Centralized error handler adhering to Section 5.3 error body schema
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An internal server error occurred.',
      details: err.details || {},
    },
  });
});

module.exports = app;
