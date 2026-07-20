const EmergencySettings = require('../models/EmergencySettings');
const { logAction } = require('../services/auditLogger');

async function getStatus(req, res) {
  const settings = (await EmergencySettings.findOne()) || (await EmergencySettings.create({}));
  res.json(settings);
}

async function activate(req, res) {
  let settings = await EmergencySettings.findOne();
  if (!settings) settings = new EmergencySettings();

  settings.active = true;
  settings.activatedBy = req.user.name;
  settings.activatedAt = new Date();
  settings.reason = req.body.reason || 'Not specified';
  await settings.save();

  await logAction({
    actorName: req.user.name,
    actorHospital: req.user.hospitalId,
    action: 'EMERGENCY_MODE_ACTIVATED',
    metadata: { reason: settings.reason }
  });

  req.app.get('io').emit('emergency:activated', settings);
  res.json(settings);
}

async function deactivate(req, res) {
  let settings = await EmergencySettings.findOne();
  if (!settings) settings = new EmergencySettings();

  settings.active = false;
  await settings.save();

  await logAction({
    actorName: req.user.name,
    actorHospital: req.user.hospitalId,
    action: 'EMERGENCY_MODE_DEACTIVATED'
  });

  req.app.get('io').emit('emergency:deactivated', settings);
  res.json(settings);
}

module.exports = { getStatus, activate, deactivate };
