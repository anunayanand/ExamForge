const express = require('express');
const { randomUUID } = require('crypto');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health.routes');
const languageRoutes = require('./routes/language.routes');
const executionRoutes = require('./routes/execution.routes');

const app = express();
app.use(express.json());

// Attach requestId
app.use((req, res, next) => {
    req.requestId = randomUUID();
    next();
});

// Mount route groups
app.use('/', healthRoutes);
app.use('/api/v1/languages', languageRoutes);
app.use('/api/v1/execute', executionRoutes);

// Register error handler last
app.use(errorHandler);

module.exports = app;
