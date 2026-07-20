const Transport = require('../models/Transport');

/**
 * Simulates real-time organ transport by linearly interpolating between
 * origin and destination coordinates over the predicted ETA duration,
 * emitting a 'transport:update' event every few seconds so the frontend
 * live map can animate movement.
 *
 * This is a simulation for demonstration purposes -- it does not
 * integrate with any real vehicle GPS or logistics provider.
 */
function startSimulatedTransport(io, transport, etaMinutes) {
  const totalDurationMs = Math.max(etaMinutes, 1) * 60 * 1000;
  // Update roughly 30 times over the journey (min 3s, max 15s interval)
  // so short and long ETAs both animate reasonably on screen.
  const tickIntervalMs = Math.min(Math.max(totalDurationMs / 30, 3000), 15000);

  const startTime = Date.now();
  const { lat: originLat, lng: originLng } = transport.origin;
  const { lat: destLat, lng: destLng } = transport.destination;

  const interval = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDurationMs, 1);

    const currentLocation = {
      lat: originLat + (destLat - originLat) * progress,
      lng: originLng + (destLng - originLng) * progress
    };

    try {
      const updated = await Transport.findByIdAndUpdate(
        transport._id,
        { currentLocation, status: progress >= 1 ? 'delivered' : 'in_transit' },
        { new: true }
      );

      io.emit('transport:update', {
        transportId: transport._id,
        matchId: transport.match,
        currentLocation,
        progress: Math.round(progress * 100),
        status: updated.status
      });

      if (progress >= 1) {
        clearInterval(interval);
        io.emit('transport:delivered', { transportId: transport._id, matchId: transport.match });
      }
    } catch (err) {
      console.error('[transportSimulator] Failed to update transport:', err.message);
      clearInterval(interval);
    }
  }, tickIntervalMs);
}

module.exports = { startSimulatedTransport };
