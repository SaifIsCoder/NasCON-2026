'use strict';

/**
 * Real-time Sockets Registry
 * Dispatches live score events to connected listeners.
 */

const { logger } = require('../config/logger');

class SocketManager {
  constructor() {
    this.clients = new Set();
  }

  attachServer(server) {
    logger.info('Socket service attached to HTTP server');
  }

  broadcastMatchEvent(matchId, event) {
    logger.debug(`Broadcasting match event for match ${matchId}`, event);
  }
}

const socketManager = new SocketManager();

module.exports = {
  socketManager,
};
