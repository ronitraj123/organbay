const AuditLog = require('../models/AuditLog');

async function listAuditLogs(req, res) {
  const logs = await AuditLog.find()
    .populate('actorHospital')
    .sort({ timestamp: -1 })
    .limit(200);
  res.json(logs);
}

module.exports = { listAuditLogs };
