const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const validateRequest = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        logger.warn({
            requestId: req.requestId,
            errors: error.errors
        }, 'Validation Error');
        next(new ValidationError('Invalid request body'));
    }
};

module.exports = { validateRequest };
