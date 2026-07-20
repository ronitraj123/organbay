const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    origin: { lat: Number, lng: Number },
    destination: { lat: Number, lng: Number },
    currentLocation: { lat: Number, lng: Number },
    startedAt: { type: Date, default: Date.now },
    predictedArrival: { type: Date },
    status: { type: String, enum: ['pending', 'in_transit', 'delivered'], default: 'pending' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transport', transportSchema);
