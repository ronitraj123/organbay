const mongoose = require('mongoose');

// Represents a hospital staff login. Kept intentionally simple (single role
// per user) for demonstration purposes -- a production system would need
// more granular RBAC (coordinator, surgeon, admin, etc).
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    role: { type: String, enum: ['coordinator', 'admin'], default: 'coordinator' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
