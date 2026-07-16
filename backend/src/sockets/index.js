const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Farmer = require('../models/Farmer');

function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.user.id}`);

    if (socket.user.role === 'farmer') {
      const farmer = await Farmer.findOne({ user: socket.user.id });
      if (farmer) socket.join(`farmer:${farmer._id}`);
    }

    socket.on('dao:join', () => socket.join('dao'));

    socket.on('disconnect', () => {
      // rooms are cleaned up automatically by socket.io
    });
  });

  return io;
}

module.exports = { initSockets };
