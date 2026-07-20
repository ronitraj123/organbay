const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listRecipients, createRecipient } = require('../controllers/recipientController');

router.get('/', listRecipients);
router.post('/', requireAuth, createRecipient);

module.exports = router;
