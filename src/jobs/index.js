'use strict';

/**
 * Background Jobs & Task Registry
 */

const { logger } = require('../config/logger');
const { queueService } = require('../integrations/queue/queue.service');

function initJobs() {
  queueService.registerHandler('audit:log', async (data) => {
    logger.debug('Audit log job executed', data);
  });
  logger.info('Background jobs initialized');
}

module.exports = {
  initJobs,
};
