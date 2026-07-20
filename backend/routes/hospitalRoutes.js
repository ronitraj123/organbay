const express = require('express');
const router = express.Router();
const { listHospitals, getHospital } = require('../controllers/hospitalController');

router.get('/', listHospitals);
router.get('/:id', getHospital);

module.exports = router;
