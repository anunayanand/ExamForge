const { Status } = require('./constants');

class BaseError extends Error {
    constructor(message, statusCode, statusEnum) {
        super(message);
        this.statusCode = statusCode;
        this.statusEnum = statusEnum;
        this.name = this.constructor.name;
    }
}

class ValidationError extends BaseError {
    constructor(message = 'Invalid Request') {
        super(message, 400, Status.INVALID_REQUEST);
    }
}

class AuthError extends BaseError {
    constructor(message = 'Unauthorized') {
        super(message, 401, null);
    }
}

class QueueFullError extends BaseError {
    constructor(message = 'System Busy') {
        super(message, 429, null); // SYSTEM_BUSY
    }
}

class SystemError extends BaseError {
    constructor(message = 'System Error') {
        super(message, 500, Status.SYSTEM_ERROR);
    }
}

module.exports = {
    BaseError,
    ValidationError,
    AuthError,
    QueueFullError,
    SystemError
};
