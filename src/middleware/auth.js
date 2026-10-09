const crypto = require('crypto');
const config = require('../config/env');
const { AuthError } = require('../utils/errors');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthError('Missing or invalid Authorization header');
        }

        const token = authHeader.split(' ')[1];
        
        // Use constant-time comparison to prevent timing attacks
        const expectedToken = Buffer.from(config.executorApiKey);
        const actualToken = Buffer.from(token);
        
        if (expectedToken.length !== actualToken.length || !crypto.timingSafeEqual(expectedToken, actualToken)) {
            throw new AuthError('Invalid API Key');
        }

        next();
    } catch (error) {
        next(new AuthError('Unauthorized'));
    }
};

module.exports = { authenticate };
