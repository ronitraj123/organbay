const Organ = require('../models/Organ');
const Recipient = require('../models/Recipient');
const Match = require('../models/Match');
const EmergencySettings = require('../models/EmergencySettings');
const { computeCompatibility } = require('./compatibilityEngine');
const { predictEta } = require('./mlClient');
const { logAction } = require('./auditLogger');

// In normal mode, only propose matches to this many top-ranked recipients.
const NORMAL_MODE_CANDIDATE_LIMIT = 3;
// In emergency mode, broadcast wider.
const EMERGENCY_MODE_CANDIDATE_LIMIT = 8;

/**
 * Core matching pipeline, run whenever a new organ is listed:
 *   1. Find waiting recipients needing that organ type.
 *   2. Score each with the deterministic compatibility engine (blood
 *      type gate + HLA overlap -- see compatibilityEngine.js).
 *   3. Rank candidates -- by urgencyScore first if emergency mode is
 *      active, otherwise by compatibilityIndex first.
 *   4. For the top N candidates, call the ML ETA service and create
 *      proposed Match documents.
 *
 * Returns the created Match documents (already populated with organ +
 * recipient) so the caller can emit socket events.
 */
async function runMatchingForOrgan(organ, io) {
  const emergency = await EmergencySettings.findOne();
  const isEmergency = !!(emergency && emergency.active);
  const candidateLimit = isEmergency ? EMERGENCY_MODE_CANDIDATE_LIMIT : NORMAL_MODE_CANDIDATE_LIMIT;

  const waitingRecipients = await Recipient.find({
    organNeeded: organ.organType,
    status: 'waiting'
  }).populate('hospital');

  const scored = waitingRecipients
    .map((recipient) => {
      const compat = computeCompatibility(organ, recipient);
      return { recipient, compat };
    })
    .filter((entry) => entry.compat.bloodTypeCompatible);

  scored.sort((a, b) => {
    if (isEmergency) {
      // Emergency mode: most urgent recipient wins ties first.
      if (b.recipient.urgencyScore !== a.recipient.urgencyScore) {
        return b.recipient.urgencyScore - a.recipient.urgencyScore;
      }
      return b.compat.compatibilityIndex - a.compat.compatibilityIndex;
    }
    // Normal mode: best demonstration compatibility index first, then urgency.
    if (b.compat.compatibilityIndex !== a.compat.compatibilityIndex) {
      return b.compat.compatibilityIndex - a.compat.compatibilityIndex;
    }
    return b.recipient.urgencyScore - a.recipient.urgencyScore;
  });

  const topCandidates = scored.slice(0, candidateLimit);
  const sourceHospital = await organ.populate('sourceHospital').then((o) => o.sourceHospital);

  const createdMatches = [];

  for (const { recipient, compat } of topCandidates) {
    const destHospital = recipient.hospital;

    const etaResult = await predictEta({
      origin: sourceHospital.location,
      destination: destHospital.location,
      organType: organ.organType
    });

    const match = await Match.create({
      organ: organ._id,
      recipient: recipient._id,
      bloodTypeCompatible: compat.bloodTypeCompatible,
      compatibilityIndex: compat.compatibilityIndex,
      hlaOverlapPercent: compat.hlaOverlapPercent,
      predictedEtaMinutes: etaResult.predictedEtaMinutes,
      etaSource: etaResult.source,
      distanceKm: etaResult.distanceKm,
      emergencyMatch: isEmergency,
      status: 'proposed'
    });

    await logAction({
      actorName: 'system:matching-engine',
      actorHospital: sourceHospital._id,
      action: 'MATCH_PROPOSED',
      targetType: 'Match',
      targetId: match._id,
      metadata: {
        organType: organ.organType,
        compatibilityIndex: compat.compatibilityIndex,
        emergency: isEmergency
      }
    });

    const populatedMatch = await match.populate([
      { path: 'organ', populate: { path: 'sourceHospital' } },
      { path: 'recipient', populate: { path: 'hospital' } }
    ]);

    createdMatches.push(populatedMatch);

    if (io) {
      io.to(`hospital:${destHospital._id}`).emit('match:proposed', populatedMatch);
    }
  }

  if (organ.status === 'available' && createdMatches.length > 0) {
    organ.status = 'proposed';
    await organ.save();
  }

  return createdMatches;
}

module.exports = { runMatchingForOrgan };
