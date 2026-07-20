const mongoose = require('mongoose');

// Singleton document controlling system-wide emergency mode. When active,
// the matching engine broadcasts to a wider hospital radius and sorts
// candidate recipients by urgencyScore first (see matchingService.js).
const emergencySettingsSchema = new mongoose.Schema({
  active: { type: Boolean, default: false },
  activatedBy: { type: String },
  activatedAt: { type: Date },
  reason: { type: String }
});

module.exports = mongoose.model('EmergencySettings', emergencySettingsSchema);
