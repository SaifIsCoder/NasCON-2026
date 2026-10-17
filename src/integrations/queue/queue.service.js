'use strict';

/**
 * Queue Service Integration
 * Manages background task dispatching and offline queue processing.
 */

const { logger } = require('../../config/logger');

class QueueService {
  constructor() {
    this.jobs = [];
    this.handlers = new Map();
  }

  registerHandler(topic, handlerFn) {
    this.handlers.set(topic, handlerFn);
  }

  async enqueue(topic, payload) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      topic,
      payload,
      status: 'pending',
      createdAt: new Date(),
    };
    this.jobs.push(job);
    logger.debug(`Job enqueued: ${job.id} on topic ${topic}`);

    const handler = this.handlers.get(topic);
    if (handler) {
      setImmediate(async () => {
        try {
          await handler(payload);
          job.status = 'completed';
        } catch (err) {
          job.status = 'failed';
          logger.error(`Error processing job ${job.id}: ${err.message}`);
        }
      });
    }

    return job;
  }
}

const queueService = new QueueService();

module.exports = {
  QueueService,
  queueService,
};
