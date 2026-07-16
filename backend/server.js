const http = require('http');
const createApp = require('./src/app');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { initSockets } = require('./src/sockets');

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = initSockets(httpServer);
  app.set('io', io);

  // Connect to Mongo in the background; server still listens even if this fails,
  // so /api/health and /api/auth (register/login errors) remain reachable for diagnosis.
  connectDB();

  httpServer.listen(env.PORT, () => {
    console.log(`[server] AgriCarbon DAO API listening on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`[server] email=${env.flags.emailConfigured ? 'configured' : 'console_fallback'} ` +
      `ipfs=${env.flags.ipfsConfigured ? 'configured' : 'local_fallback'} ` +
      `blockchain=${env.flags.blockchainConfigured ? 'configured' : 'not_configured'} ` +
      `weather=${env.flags.weatherConfigured ? 'configured' : 'not_configured'}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal startup error', err);
  process.exit(1);
});
