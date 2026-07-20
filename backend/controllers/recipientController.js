const Recipient = require('../models/Recipient');
const { logAction } = require('../services/auditLogger');
const { runMatchingForRecipient } = require('../services/matchingService');

async function listRecipients(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  // Optional scoping to a single hospital's own waitlist -- omitted by
  // default so coordinators see the full network (see README's design
  // note on network-wide visibility).
  if (req.query.hospital) filter.hospital = req.query.hospital;
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

    const io = req.app.get('io');
    io.emit('recipient:new', recipient);

    // Matching was previously organ-triggered only -- an organ already
    // sitting available when this recipient registers would otherwise
    // never be reconsidered. Run the same matching pipeline from the
    // recipient's side against existing available organs.
    const matches = await runMatchingForRecipient(recipient, io);

    if (matches.length > 0) {
      await logAction({
        actorName: 'system:matching-engine',
        actorHospital: hospital,
        action: 'MATCHING_RUN_COMPLETED',
        targetType: 'Recipient',
        targetId: recipient._id,
        metadata: { candidatesProposed: matches.length, triggeredBy: 'recipient-registration' }
      });
    }

    res.status(201).json({ recipient, matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listRecipients, createRecipient };