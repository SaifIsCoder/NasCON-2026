'use strict';

/**
 * NaSCon '26 Express Server Entrypoint
 * Applies database migrations and binds to process.env.PORT (default: 8080) per Section 5.3.
 */

const app = require('./app');
const db = require('./db');
const { checkHealth, performReset } = require('./modules/system/system.service');

const PORT = parseInt(process.env.PORT || '8080', 10);

let server;

async function start() {
  try {
    await db.migrate();
    console.log('Database migrations verified successfully.');

    // Automatically seed baseline data if not already seeded
    const health = await checkHealth();
    if (!health.healthy) {
      console.log('Seeding baseline data on startup...');
      await performReset({ seed: 42 });
      console.log('Baseline data seeded successfully.');
    }
  } catch (err) {
    console.warn('Startup database notice:', err.message);
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`NaSCon '26 Backend API listening on port ${PORT}`);
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
