const mongoose = require('mongoose');
const Match = require('../models/Match');
const Organ = require('../models/Organ');
const Recipient = require('../models/Recipient');
const Transport = require('../models/Transport');
const { logAction } = require('../services/auditLogger');
const { startSimulatedTransport } = require('../sockets/transportSimulator');
const { runMatchingForOrgan } = require('../services/matchingService');

async function listMatches(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const matches = await Match.find(filter)
    .populate({ path: 'organ', populate: { path: 'sourceHospital' } })
    .populate({ path: 'recipient', populate: { path: 'hospital' } })
    .sort({ createdAt: -1 });
  res.json(matches);
}

/**
 * Accepting a match touches five things that all need to succeed or fail
 * together: the Match's own status, the Organ's status, the Recipient's
 * status, any competing proposed Matches for the same organ, and the new
 * Transport record. A partial write here (e.g. organ marked in_transit
 * but no Transport created) would be a real data-integrity bug, not just
 * a cosmetic one -- so this whole block runs inside a MongoDB
 * multi-document transaction (session), and rolls back atomically if any
 * step fails. This is deliberate: MongoDB was chosen for this project for
 * schema flexibility during rapid iteration, but the state-transition
 * writes specifically use ACID transactions rather than relying on
 * document-level atomicity alone. See README.md "Why MongoDB?" for the
 * full design rationale, including when a relational store would be the
 * better production choice.
 */
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