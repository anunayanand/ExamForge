const { Status } = require('../utils/constants');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const statusEnum = err.statusEnum || Status.SYSTEM_ERROR;
    const message = err.message || 'Internal Server Error';

    // Log the error
    if (statusCode >= 500) {
        logger.error({ err, requestId: req.requestId }, 'System Error');
    } else {
        logger.warn({ errMessage: err.message, requestId: req.requestId, status: statusCode }, 'Client Error');
    }

    res.status(statusCode).json({
        success: false,
        status: statusEnum,
        error: message
    });
};

module.exports = errorHandler;
