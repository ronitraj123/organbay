const express = require('express');
const router = express.Router();
const { getTransportByMatch, listActiveTransports } = require('../controllers/transportController');

router.get('/active', listActiveTransports);
router.get('/by-match/:matchId', getTransportByMatch);

module.exports = router;
