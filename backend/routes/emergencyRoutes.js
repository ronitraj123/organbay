const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getStatus, activate, deactivate } = require('../controllers/emergencyController');

router.get('/', getStatus);
router.post('/activate', requireAuth, requireAdmin, activate);
router.post('/deactivate', requireAuth, requireAdmin, deactivate);

module.exports = router;
