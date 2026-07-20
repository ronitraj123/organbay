/**
 * Sets up Socket.IO connection handling and room membership.
 *
 * Rooms:
 *   hospital:{hospitalId} - targeted events for a specific hospital
 *                            (e.g. a new match proposal for them)
 *   (default/global)      - broadcast events like organ:new,
 *                            emergency:activated, transport:update
 */
function initSocketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('join:hospital', (hospitalId) => {
      if (!hospitalId) return;
      socket.join(`hospital:${hospitalId}`);
      console.log(`[socket] ${socket.id} joined room hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocketHandler };
