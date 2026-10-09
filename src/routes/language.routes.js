const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Language } = require('../utils/constants');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
    res.json({
        success: true,
        data: Object.values(Language)
    });
});

module.exports = router;
