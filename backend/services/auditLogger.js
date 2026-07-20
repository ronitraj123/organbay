const AuditLog = require('../models/AuditLog');

/**
 * Central audit-logging helper. Every state-changing action in the
 * system should call this so the AuditLog collection stays a complete,
 * queryable trail of what happened, when, and by whom.
 */
async function logAction({ actorName, actorHospital, action, targetType, targetId, metadata = {} }) {
  try {
    await AuditLog.create({ actorName, actorHospital, action, targetType, targetId, metadata });
  } catch (err) {
    // Audit logging should never crash the primary request flow, but we
    // do want it loud in the server logs if it silently fails.
    console.error('[auditLogger] Failed to write audit log entry:', err.message);
  }
}

module.exports = { logAction };
