/**
 * compatibilityEngine.js
 *
 * =====================================================================
 * IMPORTANT / READ BEFORE MODIFYING:
 * This module implements a SIMPLIFIED, RULE-BASED, DETERMINISTIC
 * compatibility check using blood group rules and a representative HLA
 * marker overlap calculation, for DEMONSTRATION PURPOSES ONLY.
 *
 * It does NOT implement real histocompatibility testing, crossmatch
 * testing, antigen/antibody analysis, or any clinically valid matching
 * logic. It is not intended for, and must never be used for, real
 * clinical decision-making. Real organ allocation involves certified
 * laboratory testing, national policy (in India: NOTTO/ROTTO/SOTTO
 * coordination), transplant-center-specific criteria, and physician
 * judgment -- none of which this module attempts to replicate.
 * =====================================================================
 */

// Standard blood donor -> compatible recipient chart.
const BLOOD_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // universal donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'] // can only give to AB+
};

function isBloodTypeCompatible(donorBloodType, recipientBloodType) {
  const compatibleRecipients = BLOOD_COMPATIBILITY[donorBloodType] || [];
  return compatibleRecipients.includes(recipientBloodType);
}

/**
 * Naive marker-overlap percentage: what fraction of the RECIPIENT's
 * recorded markers are also present on the donor organ. This is a simple
 * set-intersection calculation -- not a weighted immunological score.
 */
function hlaOverlapPercent(donorMarkers = [], recipientMarkers = []) {
  if (!recipientMarkers.length) return 0;
  const donorSet = new Set(donorMarkers.map((m) => m.trim().toUpperCase()));
  const matchCount = recipientMarkers.filter((m) => donorSet.has(m.trim().toUpperCase())).length;
  return Math.round((matchCount / recipientMarkers.length) * 100);
}

/**
 * Computes the "demonstration compatibility index" (0-100) for a given
 * organ/recipient pair. Blood type incompatibility is a hard gate --
 * an incompatible pair always scores 0 and is excluded from matching,
 * mirroring the one piece of this logic that IS medically real.
 *
 * Weighting (arbitrary, for demo ranking purposes only):
 *   - 40 pts baseline for passing the blood-type gate
 *   - up to 60 pts scaled from HLA marker overlap percentage
 */
function computeCompatibility(organ, recipient) {
  const bloodTypeCompatible = isBloodTypeCompatible(organ.bloodType, recipient.bloodType);

  if (!bloodTypeCompatible) {
    return {
      bloodTypeCompatible: false,
      hlaOverlapPercent: 0,
      compatibilityIndex: 0
    };
  }

  const overlap = hlaOverlapPercent(organ.hlaMarkers, recipient.hlaMarkers);
  const compatibilityIndex = Math.round(40 + overlap * 0.6);

  return {
    bloodTypeCompatible: true,
    hlaOverlapPercent: overlap,
    compatibilityIndex
  };
}

module.exports = {
  isBloodTypeCompatible,
  hlaOverlapPercent,
  computeCompatibility
};
