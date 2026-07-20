const Transport = require('../models/Transport');

async function getTransportByMatch(req, res) {
  const transport = await Transport.findOne({ match: req.params.matchId });
  if (!transport) return res.status(404).json({ error: 'Transport not found.' });
  res.json(transport);
}

async function listActiveTransports(req, res) {
  const transports = await Transport.find({ status: 'in_transit' }).populate({
    path: 'match',
    populate: [
      { path: 'organ', populate: { path: 'sourceHospital' } },
      { path: 'recipient', populate: { path: 'hospital' } }
    ]
  });
  res.json(transports);
}

module.exports = { getTransportByMatch, listActiveTransports };
