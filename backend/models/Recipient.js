const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    // Anonymized/synthetic identifier only -- no real patient data is ever
    // stored or intended to be stored by this project.
    displayId: { type: String, required: true },
    organNeeded: {
      type: String,
      enum: ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'],
      required: true
    },
    bloodType: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: true
    },
    hlaMarkers: { type: [String], default: [] },
    // 0-100, higher = more urgent. In this demo it is entered/simulated
    // directly rather than derived from a real clinical scoring system
    // (e.g. MELD for liver).
    urgencyScore: { type: Number, min: 0, max: 100, default: 50 },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    status: { type: String, enum: ['waiting', 'matched', 'transplanted', 'inactive'], default: 'waiting' },
    waitlistedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipient', recipientSchema);
