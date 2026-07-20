const mongoose = require('mongoose');

// Every state-changing action in the system writes an entry here. This is
// the project's traceability layer -- see README's "MongoDB vs ACID"
// discussion for how atomicity is handled for state transitions.
const auditLogSchema = new mongoose.Schema(
  {
    actorName: { type: String, required: true },
    actorHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    action: { type: String, required: true }, // e.g. "ORGAN_LISTED", "MATCH_ACCEPTED"
    targetType: { type: String }, // "Organ" | "Recipient" | "Match" | "Transport"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
