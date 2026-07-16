const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[db] connected -> ${env.MONGODB_URI}`);
  } catch (err) {
    isConnected = false;
    console.error(`[db] connection failed: ${err.message}`);
    console.error('[db] server will continue running; DB-dependent routes will return 503 until Mongo is reachable.');
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[db] disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[db] reconnected');
  });
}

function requireDB(req, res, next) {
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: 'database_unavailable',
      message: 'Database is not connected. Check MONGODB_URI.',
    });
  }
  next();
}

module.exports = { connectDB, requireDB, isConnected: () => isConnected };
