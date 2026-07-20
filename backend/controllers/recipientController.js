const Recipient = require('../models/Recipient');
const { logAction } = require('../services/auditLogger');

async function listRecipients(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const recipients = await Recipient.find(filter).populate('hospital').sort({ urgencyScore: -1 });
  res.json(recipients);
}

async function createRecipient(req, res) {
  try {
    const { displayId, organNeeded, bloodType, hlaMarkers, urgencyScore } = req.body;
    const hospital = req.user.hospitalId;

    const recipient = await Recipient.create({
      displayId,
      organNeeded,
      bloodType,
      hlaMarkers: hlaMarkers || [],
      urgencyScore: urgencyScore ?? 50,
      hospital
    });

    await logAction({
      actorName: req.user.name,
      actorHospital: hospital,
      action: 'RECIPIENT_REGISTERED',
      targetType: 'Recipient',
      targetId: recipient._id,
      metadata: { organNeeded, bloodType }
    });

    req.app.get('io').emit('recipient:new', recipient);
    res.status(201).json(recipient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listRecipients, createRecipient };
