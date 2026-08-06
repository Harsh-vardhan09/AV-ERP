const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { corsOptions } = require('../config/cors');
const logger = require('../logging/logger');

// Module-level singleton so services and workers can emit without a circular
// import back to the boot file
let _io = null;

const setIo = (io) => { _io = io; };

const getIo = () => _io;

const emitToRoom = (room, event, data) => {
  if (_io) {
    _io.to(room).emit(event, data);
  }
};

const emitToAll = (event, data) => {
  if (_io) {
    _io.emit(event, data);
  }
};

// Room convention: 'user:{userId}'
const emitToUser = (userId, event, data) => {
  try {
    if (_io && userId) {
      _io.to(`user:${userId.toString()}`).emit(event, data);
    }
  } catch (err) {
    // Socket failures are non-critical — log and continue
    logger.error('[socket] emitToUser error:', err.message);
  }
};

const attachSocket = (server) => {
  const io = new Server(server, { cors: corsOptions });
  setIo(io);

  io.use((socket, next) => {
    try {
      // HttpOnly cookies arrive on the WS upgrade, so read the raw cookie header
      const cookieHeader = socket.handshake.headers?.cookie || '';
      const tokenCookie = cookieHeader
        .split(';')
        .find(c => c.trim().startsWith('token='));
      const token = tokenCookie?.split('=').slice(1).join('=').trim();

      if (!token) {
        const authHeader = socket.handshake.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const bearerToken = authHeader.split(' ')[1];
          const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
          socket.userId = decoded.userid;
          return next();
        }
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userid;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join personal notification room on connect
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Allow joining school/class/chat rooms but NOT arbitrary user rooms
    socket.on('join:room', (room) => {
      const allowedPrefixes = ['school:', 'class:', 'chat:'];
      const isAllowed = allowedPrefixes.some(prefix => room.startsWith(prefix));
      if (isAllowed) {
        socket.join(room);
      }
      // 'user:' rooms auto-joined above — clients cannot manually join user rooms
    });

    logger.info('[Socket.io] Client connected', { socketId: socket.id, userId: socket.userId });
    socket.on('disconnect', () => {
      logger.info('[Socket.io] Client disconnected', { socketId: socket.id });
    });
  });

  return io;
};

module.exports = { attachSocket, setIo, getIo, emitToRoom, emitToAll, emitToUser };
