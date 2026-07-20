const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listAuditLogs } = require('../controllers/auditController');

router.get('/', requireAuth, listAuditLogs);

module.exports = router;
