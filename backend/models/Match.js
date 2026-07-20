const mongoose = require('mongoose');

// A Match represents a proposed (or accepted/rejected) pairing between an
// available organ and a waiting recipient, produced by the deterministic
// compatibility engine -- see services/compatibilityEngine.js.
const matchSchema = new mongoose.Schema(
  {
    organ: { type: mongoose.Schema.Types.ObjectId, ref: 'Organ', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipient', required: true },
    bloodTypeCompatible: { type: Boolean, required: true },
    // 0-100 "demonstration compatibility index" -- NOT a clinical
    // compatibility score. See README for the exact disclaimer wording.
    compatibilityIndex: { type: Number, min: 0, max: 100, required: true },
    hlaOverlapPercent: { type: Number, min: 0, max: 100, required: true },
    predictedEtaMinutes: { type: Number },
    etaSource: { type: String, enum: ['ml-service', 'fallback-haversine'], default: 'fallback-haversine' },
    distanceKm: { type: Number },
    emergencyMatch: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['proposed', 'accepted', 'rejected', 'completed'],
      default: 'proposed'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);
