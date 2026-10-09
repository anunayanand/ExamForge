const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDev
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
              },
          }
        : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    redact: {
        paths: [
            'code',
            'sourceCode',
            'headers.authorization',
            'headers["x-api-key"]',
            'apiKey',
            'req.headers.authorization',
            'tests[*].input',
            'tests[*].expectedOutput',
            'payload.code',
            'payload.tests'
        ],
        censor: '[REDACTED]'
    }
});

module.exports = logger;
