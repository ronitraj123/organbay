const nodemailer = require('nodemailer');
const User = require('../models/User');



let transporter = null;
let warnedOnce = false;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (!warnedOnce) {
      console.log('[emailService] EMAIL_USER/EMAIL_PASS not set -- email notifications disabled (this is fine, matching still works).');
      warnedOnce = true;
    }
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  return transporter;
}

/**
 * Sends an email to every coordinator/admin user at a given hospital.
 * Fire-and-forget from the caller's perspective -- never throws, so it's
 * safe to call without awaiting inside a request handler.
 */
async function sendToHospitalCoordinators(hospitalId, subject, html) {
  const t = getTransporter();
  if (!t || !hospitalId) return;

  try {
    const users = await User.find({ hospital: hospitalId });
    if (users.length === 0) return;

    const realRecipients = users.map((u) => u.email);
    const testOverride = process.env.EMAIL_TEST_OVERRIDE;
    const to = testOverride || realRecipients.join(',');
    const finalSubject = testOverride ? `[TEST → would go to: ${realRecipients.join(', ')}] ${subject}` : subject;

    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: finalSubject,
      html
    });

    if (testOverride) {
      console.log(`[emailService] TEST MODE: redirected "${subject}" (intended for ${realRecipients.join(', ')}) to ${testOverride}`);
    } else {
      console.log(`[emailService] Sent "${subject}" to ${users.length} user(s) at hospital ${hospitalId}`);
    }
  } catch (err) {
    console.error('[emailService] Failed to send notification email:', err.message);
  }
}

module.exports = { sendToHospitalCoordinators };