const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listOrgans, createOrgan } = require('../controllers/organController');

router.get('/', listOrgans);
router.post('/', requireAuth, createOrgan);

module.exports = router;
