// ══════════════════════════════════════════════════════════════════
// Socket.io — Module-level singleton
// Stores the io instance created in index.js so it can be
// imported by services/workers without circular references.
// Usage: call setIo(io) once on server start; call getIo() anywhere.
// ══════════════════════════════════════════════════════════════════
let _io = null;

const setIo = (io) => { _io = io; };

const getIo = () => _io;

/**
 * Emit to a room safely — no-op if socket.io not yet initialised.
 */
const emitToRoom = (room, event, data) => {
  if (_io) {
    _io.to(room).emit(event, data);
  }
};

/**
 * Emit to all connected clients — no-op if socket.io not initialised.
 */
const emitToAll = (event, data) => {
  if (_io) {
    _io.emit(event, data);
  }
};

/**
 * Emit to a specific user's personal room.
 * Room convention: 'user:{userId}'
 * Non-critical — never throws.
 */
const emitToUser = (userId, event, data) => {
  try {
    if (_io && userId) {
      _io.to(`user:${userId.toString()}`).emit(event, data);
    }
  } catch (err) {
    // Socket failures are non-critical — log and continue
    console.error('[socket] emitToUser error:', err.message);
  }
};

module.exports = { setIo, getIo, emitToRoom, emitToAll, emitToUser };
