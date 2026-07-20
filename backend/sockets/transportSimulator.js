const Transport = require('../models/Transport');

/**
 * Simulates real-time organ transport by linearly interpolating between
 * origin and destination coordinates over the predicted ETA duration,
 * emitting a 'transport:update' event every few seconds so the frontend
 * live map can animate movement.
 *
 * @param {object} startTimeOverride 
 */
function startSimulatedTransport(io, transport, etaMinutes, startTimeOverride) {
  const totalDurationMs = Math.max(etaMinutes, 1) * 60 * 1000;
  // Update roughly 30 times over the journey (min 3s, max 15s interval)
  // so short and long ETAs both animate reasonably on screen.
  const tickIntervalMs = Math.min(Math.max(totalDurationMs / 30, 3000), 15000);

  const startTime = startTimeOverride ? startTimeOverride.getTime() : Date.now();
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

/**
 * Recovery routine, called once when the server boots. Any Transport left
 * with status 'in_transit' from before a restart has no running
 * setInterval anymore (that state was lost). For each one:
 *   - if its predicted arrival time has already passed, mark it
 *     delivered immediately (best guess: it would have finished)
 *   - otherwise, resume the simulation loop, backdating startTime so
 *     progress continues smoothly from roughly where it should be,
 *     rather than restarting the animation from the origin hospital
 * */
async function resumeAllInTransitTransports(io) {
  const staleTransports = await Transport.find({ status: 'in_transit' });

  if (staleTransports.length === 0) {
    console.log('[transportSimulator] No in-transit transports to resume.');
    return;
  }

  console.log(`[transportSimulator] Resuming ${staleTransports.length} in-transit transport(s) after restart...`);

  for (const transport of staleTransports) {
    const now = Date.now();
    const predictedArrival = transport.predictedArrival ? transport.predictedArrival.getTime() : now;

    if (predictedArrival <= now) {
      // ETA already passed while the server was down -- resolve it
      // rather than leaving it stuck forever.
      await Transport.findByIdAndUpdate(transport._id, {
        status: 'delivered',
        currentLocation: transport.destination
      });
      io.emit('transport:delivered', { transportId: transport._id, matchId: transport.match });
      console.log(`[transportSimulator] Transport ${transport._id} had already passed its ETA -- marked delivered.`);
      continue;
    }

    const totalDurationMs = predictedArrival - transport.startedAt.getTime();
    const etaMinutes = totalDurationMs / 60000;
    // Backdate the effective start time so progress resumes from where
    // it realistically should be, instead of restarting from 0%.
    startSimulatedTransport(io, transport, etaMinutes, transport.startedAt);
  }
}

module.exports = { startSimulatedTransport, resumeAllInTransitTransports };