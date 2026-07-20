const mongoose = require('mongoose');

// NOTE ON hlaMarkers: These are simplified, representative marker strings
// (e.g. "A1", "B7", "DR15") entered by hospital staff for demonstration
// purposes. This project does NOT implement real HLA typing, antigen/
// antibody crossmatch testing, or any clinically valid immunological
// matching. See compatibilityEngine.js and README.md for details.
const organSchema = new mongoose.Schema(
  {
    organType: {
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
    harvestedAt: { type: Date, required: true, default: Date.now },
    // Rough clinically-informed cold ischemia windows, used only to drive
    // the demo's urgency/expiry countdown -- not medical guidance.
    coldIschemiaLimitHours: { type: Number, required: true, default: 12 },
    sourceHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    status: {
      type: String,
      enum: ['available', 'proposed', 'matched', 'in_transit', 'transplanted', 'expired'],
      default: 'available'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organ', organSchema);
