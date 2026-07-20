const axios = require('axios');
const { haversineDistanceKm } = require('../utils/haversine');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Requests a predicted transport ETA from the FastAPI ML microservice.
 * This is the ONE genuinely predictive ML component in the system --
 * scoped deliberately narrow to transport-time estimation from logistics
 * features (distance, time of day, organ priority). It makes no clinical
 * predictions of any kind.
 *
 * If the ML service is unreachable (e.g. cold-started free-tier host, or
 * not yet deployed), we fall back to a simple haversine-distance +
 * average-speed estimate so the rest of the system keeps working.
 */
async function predictEta({ origin, destination, organType }) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict-eta`,
      {
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        dest_lat: destination.lat,
        dest_lng: destination.lng,
        organ_type: organType,
        requested_at: new Date().toISOString()
      },
      { timeout: 8000 }
    );

    return {
      predictedEtaMinutes: Math.round(response.data.predicted_eta_minutes),
      distanceKm: Math.round(response.data.distance_km * 10) / 10,
      source: 'ml-service'
    };
  } catch (err) {
    console.warn(`[mlClient] ML service unavailable (${err.message}), using fallback estimate.`);
    const distanceKm = haversineDistanceKm(origin, destination);
    // Fallback assumption: ~25 km/h average effective speed accounting for
    // Indian metro traffic conditions, loading/unloading, and buffer time.
    const fallbackEtaMinutes = Math.round((distanceKm / 25) * 60);

    return {
      predictedEtaMinutes: fallbackEtaMinutes,
      distanceKm: Math.round(distanceKm * 10) / 10,
      source: 'fallback-haversine'
    };
  }
}

module.exports = { predictEta };
