'use strict';

/**
 * NaSCon '26 Express Server Entrypoint
 * Applies database migrations, verifies baseline readiness, and starts HTTP server.
 */

const app = require('./app');
const db = require('./config/database');
const { HealthService } = require('./services/health.service');
const { ResetService } = require('./services/reset.service');
const { logger } = require('./config/logger');
const { env } = require('./config/env');

const PORT = env.PORT;

let server;

async function start() {
  try {
    await db.migrate();
    logger.info('Database migrations verified successfully.');

    // Automatically seed baseline data if not already seeded
    const health = await HealthService.checkHealth();
    if (!health.healthy) {
      logger.info('Seeding baseline data on startup...');
      await ResetService.performReset({ seed: 42 });
      logger.info('Baseline data seeded successfully.');
    }
  } catch (err) {
    logger.warn(`Startup database notice: ${err.message}`);
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`NaSCon '26 Backend API listening on port ${PORT}`);
  });
}

// Graceful termination handling
process.on('SIGTERM', () => {
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

start();

module.exports = app;
