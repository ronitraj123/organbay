const Hospital = require('../models/Hospital');

async function listHospitals(req, res) {
  const hospitals = await Hospital.find().sort({ name: 1 });
  res.json(hospitals);
}

async function getHospital(req, res) {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });
  res.json(hospital);
}

module.exports = { listHospitals, getHospital };
