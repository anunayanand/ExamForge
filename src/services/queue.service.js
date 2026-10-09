const { QueueFullError } = require('../utils/errors');
const logger = require('../utils/logger');

// Constants can be moved to env.js if configurable, but hardcoding for simplicity
const MAX_CONCURRENT_JOBS = 10;
const MAX_QUEUE_SIZE = 100;

class QueueService {
    constructor() {
        this.queue = [];
        this.activeCount = 0;
    }

    async enqueue(jobFn) {
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            throw new QueueFullError('System Busy: Queue is full');
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ jobFn, resolve, reject });
            this._processNext();
        });
    }

    async _processNext() {
        if (this.activeCount >= MAX_CONCURRENT_JOBS || this.queue.length === 0) {
            return;
        }

        this.activeCount++;
        const { jobFn, resolve, reject } = this.queue.shift();

        try {
            const result = await jobFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.activeCount--;
            this._processNext();
        }
    }
}

module.exports = new QueueService();
