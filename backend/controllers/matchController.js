const mongoose = require('mongoose');
const Match = require('../models/Match');
const Organ = require('../models/Organ');
const Recipient = require('../models/Recipient');
const Transport = require('../models/Transport');
const { logAction } = require('../services/auditLogger');
const { startSimulatedTransport } = require('../sockets/transportSimulator');
const { runMatchingForOrgan } = require('../services/matchingService');
const { sendToHospitalCoordinators } = require('../services/emailService');

async function listMatches(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const matches = await Match.find(filter)
    .populate({ path: 'organ', populate: { path: 'sourceHospital' } })
    .populate({ path: 'recipient', populate: { path: 'hospital' } })
    .sort({ createdAt: -1 });
  res.json(matches);
}


async function acceptMatch(req, res) {
  const session = await mongoose.startSession();
  try {
    let resultMatch, resultTransport;

    await session.withTransaction(async () => {
      const match = await Match.findById(req.params.id)
        .populate({ path: 'organ', populate: { path: 'sourceHospital' } })
        .populate({ path: 'recipient', populate: { path: 'hospital' } })
        .session(session);

      if (!match) throw Object.assign(new Error('Match not found.'), { status: 404 });
      if (match.status !== 'proposed') {
        throw Object.assign(new Error(`Match is already ${match.status}.`), { status: 409 });
      }

      match.status = 'accepted';
      await match.save({ session });

      match.organ.status = 'in_transit';
      await match.organ.save({ session });

      match.recipient.status = 'matched';
      await match.recipient.save({ session });

      // Any other proposed matches for the same organ are now moot.
      await Match.updateMany(
        { organ: match.organ._id, _id: { $ne: match._id }, status: 'proposed' },
        { status: 'rejected' },
        { session }
      );

      const [transport] = await Transport.create(
        [
          {
            match: match._id,
            origin: match.organ.sourceHospital.location,
            destination: match.recipient.hospital.location,
            currentLocation: match.organ.sourceHospital.location,
            predictedArrival: new Date(Date.now() + (match.predictedEtaMinutes || 30) * 60 * 1000),
            status: 'in_transit'
          }
        ],
        { session }
      );

      resultMatch = match;
      resultTransport = transport;
    });

    await logAction({
      actorName: req.user.name,
      actorHospital: req.user.hospitalId,
      action: 'MATCH_ACCEPTED',
      targetType: 'Match',
      targetId: resultMatch._id,
      metadata: { organId: resultMatch.organ._id, recipientId: resultMatch.recipient._id }
    });

    const io = req.app.get('io');
    io.emit('match:accepted', resultMatch);
    io.emit('transport:started', resultTransport);

    // Begin simulated real-time movement toward the destination hospital.
    startSimulatedTransport(io, resultTransport, resultMatch.predictedEtaMinutes || 30);

    // Confirmation emails to both hospitals -- less time-critical than
    // the "match proposed" notification, but useful confirmation that
    // transport has actually started.
    sendToHospitalCoordinators(
      resultMatch.organ.sourceHospital._id,
      `OrganBay: ${resultMatch.organ.organType} match accepted -- transport starting`,
      `<p>Your ${resultMatch.organ.organType} listing has been accepted by <strong>${resultMatch.recipient.hospital.name}</strong> for recipient <strong>${resultMatch.recipient.displayId}</strong>.</p>
       <p>Simulated transport tracking is now live on the OrganBay Live Map.</p>`
    );
    sendToHospitalCoordinators(
      resultMatch.recipient.hospital._id,
      `OrganBay: ${resultMatch.organ.organType} transport confirmed for ${resultMatch.recipient.displayId}`,
      `<p>You've accepted a ${resultMatch.organ.organType} (${resultMatch.organ.bloodType}) from <strong>${resultMatch.organ.sourceHospital.name}</strong> for recipient <strong>${resultMatch.recipient.displayId}</strong>.</p>
       <p>Predicted arrival in ~${resultMatch.predictedEtaMinutes || 30} minutes. Track it live on the OrganBay Live Map.</p>`
    );

    res.json({ match: resultMatch, transport: resultTransport });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    await session.endSession();
  }
}

/**
 * Rejecting a match resolves this ONE candidate pairing -- but an organ
 * can be proposed to several recipients at once (up to the candidate
 * limit in matchingService.js), so the organ must stay 'proposed' as
 * long as any other proposal for it is still pending. Only once EVERY
 * proposed match for this organ has been resolved (rejected) do we
 * requeue the organ back to 'available' -- and re-run the matching
 * engine immediately so it doesn't just sit invisible until some other
 * event (like a new recipient registering) happens to reconsider it.
 *
 * Without this, a rejected match would leave its organ permanently
 * stuck at 'proposed': invisible on the Available Organs list and
 * excluded from all future matching, since matching only ever queries
 * status: 'available' organs.
 */
async function rejectMatch(req, res) {
  try {
    const match = await Match.findById(req.params.id).populate('organ');
    if (!match) return res.status(404).json({ error: 'Match not found.' });
    if (match.status !== 'proposed') {
      return res.status(409).json({ error: `Match is already ${match.status}.` });
    }

    match.status = 'rejected';
    await match.save();

    await logAction({
      actorName: req.user.name,
      actorHospital: req.user.hospitalId,
      action: 'MATCH_REJECTED',
      targetType: 'Match',
      targetId: match._id
    });

    const io = req.app.get('io');
    io.emit('match:rejected', match);

    const organ = match.organ;
    let requeuedMatches = [];

    if (organ && organ.status === 'proposed') {
      const remainingProposals = await Match.countDocuments({
        organ: organ._id,
        status: 'proposed'
      });

      if (remainingProposals === 0) {
        organ.status = 'available';
        await organ.save();

        await logAction({
          actorName: 'system:matching-engine',
          actorHospital: organ.sourceHospital,
          action: 'ORGAN_REQUEUED',
          targetType: 'Organ',
          targetId: organ._id,
          metadata: { reason: 'all proposed matches rejected' }
        });

        io.emit('organ:new', organ); // reuse the same event the frontend already refreshes on

        // Immediately re-run matching against the current waiting-recipient
        // pool, so the organ doesn't just sit idle until an unrelated event
        // (like a new recipient registering) happens to reconsider it.
        requeuedMatches = await runMatchingForOrgan(organ, io);
      }
    }

    res.json({ match, requeuedMatches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listMatches, acceptMatch, rejectMatch };