require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Organ = require('../models/Organ');
const Recipient = require('../models/Recipient');
const EmergencySettings = require('../models/EmergencySettings');
const hospitalSeedData = require('./hospitalSeedData');

// Representative, simplified marker labels (NOT real allele-level HLA
// nomenclature-complete data) -- purely for demonstration overlap
// calculations. See compatibilityEngine.js for the disclaimer.
const HLA_MARKER_POOL = [
  'A1', 'A2', 'A3', 'A11', 'A24',
  'B7', 'B8', 'B27', 'B44', 'B62',
  'DR3', 'DR4', 'DR7', 'DR15', 'DR51'
];

// Approximate Indian blood-type distribution, used to make seeded
// donor/recipient records feel demographically realistic.
const BLOOD_TYPE_WEIGHTS = [
  ['O+', 35], ['B+', 24], ['A+', 20], ['AB+', 7],
  ['O-', 5], ['B-', 4], ['A-', 3], ['AB-', 2]
];

const ORGAN_TYPES = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea'];

function weightedRandomBloodType() {
  const total = BLOOD_TYPE_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of BLOOD_TYPE_WEIGHTS) {
    if (roll < weight) return type;
    roll -= weight;
  }
  return 'O+';
}

function randomMarkers(count = 4) {
  const shuffled = [...HLA_MARKER_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[seed] Connected to MongoDB');

  await Promise.all([
    Hospital.deleteMany({}),
    User.deleteMany({}),
    Organ.deleteMany({}),
    Recipient.deleteMany({}),
    EmergencySettings.deleteMany({})
  ]);
  console.log('[seed] Cleared existing collections');

  const hospitals = await Hospital.insertMany(hospitalSeedData);
  console.log(`[seed] Inserted ${hospitals.length} hospitals`);

  await EmergencySettings.create({ active: false });

  // Create one demo login per hospital so every node can be logged into
  // during a demo. Password is the same for all seeded accounts -- see
  // README for credentials. DO NOT use this pattern in production.
  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const users = await User.insertMany(
    hospitals.map((h, i) => ({
      name: `${h.city} Coordinator`,
      email: `coordinator${i + 1}@organbay.demo`,
      passwordHash,
      hospital: h._id,
      role: i === 0 ? 'admin' : 'coordinator' // first hospital's user is an admin (can toggle emergency mode)
    }))
  );
  console.log(`[seed] Inserted ${users.length} demo users (password: Demo@1234)`);

  // Seed a handful of available organs across random hospitals.
  const organs = [];
  for (let i = 0; i < 10; i++) {
    const hospital = randomFrom(hospitals);
    organs.push({
      organType: randomFrom(ORGAN_TYPES),
      bloodType: weightedRandomBloodType(),
      hlaMarkers: randomMarkers(),
      harvestedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
      coldIschemiaLimitHours: 12,
      sourceHospital: hospital._id,
      status: 'available'
    });
  }
  const insertedOrgans = await Organ.insertMany(organs);
  console.log(`[seed] Inserted ${insertedOrgans.length} available organs`);

  // Seed waiting recipients across random hospitals.
  const recipients = [];
  for (let i = 0; i < 20; i++) {
    const hospital = randomFrom(hospitals);
    recipients.push({
      displayId: `R-${String(i + 1).padStart(3, '0')}`,
      organNeeded: randomFrom(ORGAN_TYPES),
      bloodType: weightedRandomBloodType(),
      hlaMarkers: randomMarkers(),
      urgencyScore: Math.floor(Math.random() * 100),
      hospital: hospital._id,
      status: 'waiting'
    });
  }
  const insertedRecipients = await Recipient.insertMany(recipients);
  console.log(`[seed] Inserted ${insertedRecipients.length} waiting recipients`);

  console.log('[seed] Done. Demo login pattern: coordinator1@organbay.demo ... Demo@1234');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
