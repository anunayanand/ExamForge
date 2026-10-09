const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy' });
});

module.exports = router;
