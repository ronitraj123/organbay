const Organ = require('../models/Organ');
const { runMatchingForOrgan } = require('../services/matchingService');
const { logAction } = require('../services/auditLogger');

async function listOrgans(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const organs = await Organ.find(filter).populate('sourceHospital').sort({ createdAt: -1 });
  res.json(organs);
}

async function createOrgan(req, res) {
  try {
    const { organType, bloodType, hlaMarkers, coldIschemiaLimitHours } = req.body;
    const sourceHospital = req.user.hospitalId;

    const organ = await Organ.create({
      organType,
      bloodType,
      hlaMarkers: hlaMarkers || [],
      coldIschemiaLimitHours: coldIschemiaLimitHours || 12,
      sourceHospital,
      harvestedAt: new Date()
    });

    await logAction({
      actorName: req.user.name,
      actorHospital: sourceHospital,
      action: 'ORGAN_LISTED',
      targetType: 'Organ',
      targetId: organ._id,
      metadata: { organType, bloodType }
    });

    const io = req.app.get('io');
    io.emit('organ:new', organ);

    // Kick off matching asynchronously-but-awaited so the API response
    // includes the proposed matches for immediate UI feedback.
    const matches = await runMatchingForOrgan(organ, io);

    await logAction({
      actorName: 'system:matching-engine',
      actorHospital: sourceHospital,
      action: 'MATCHING_RUN_COMPLETED',
      targetType: 'Organ',
      targetId: organ._id,
      metadata: { candidatesProposed: matches.length }
    });

    res.status(201).json({ organ, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listOrgans, createOrgan };
