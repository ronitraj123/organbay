const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listMatches, acceptMatch, rejectMatch } = require('../controllers/matchController');

router.get('/', listMatches);
router.post('/:id/accept', requireAuth, acceptMatch);
router.post('/:id/reject', requireAuth, rejectMatch);

module.exports = router;
