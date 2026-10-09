const logger = require('../utils/logger');
const { Status } = require('../utils/constants');

const executionService = require('../services/execution.service');
const queueService = require('../services/queue.service');

const execute = async (req, res, next) => {
    try {
        const jobId = req.requestId;
        logger.info({ jobId, language: req.body.language }, 'Received execution request');
        
        const result = await queueService.enqueue(() => executionService.execute(jobId, req.body));
        
        // Return 200 OK for execution completed (even if WRONG_ANSWER)
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    execute
};
