const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { executionSchema } = require('../validators/execution.validator');
const executionController = require('../controllers/execution.controller');

const router = express.Router();

router.post('/', authenticate, validateRequest(executionSchema), executionController.execute);

module.exports = router;
