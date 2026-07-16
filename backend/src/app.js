require('express-async-errors'); // must be required before routes so thrown errors in async handlers reach errorHandler
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const { requireDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const documentRoutes = require('./routes/documentRoutes');
const readingRoutes = require('./routes/readingRoutes');
const passportRoutes = require('./routes/passportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const companyRoutes = require('./routes/companyRoutes');
const daoRoutes = require('./routes/daoRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const emailService = require('./services/emailService');
const ipfsService = require('./services/ipfsService');
const blockchainService = require('./services/blockchainService');
const weatherService = require('./services/weatherService');
const { isConnected } = require('./config/db');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Health check also doubles as an integration-status panel for the admin/dev.
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      db: isConnected() ? 'connected' : 'disconnected',
      integrations: {
        email: emailService.isConfigured() ? 'configured' : 'console_fallback',
        ipfs: ipfsService.isConfigured() ? 'configured' : 'local_fallback',
        blockchain: blockchainService.isConfigured() ? 'configured' : 'not_configured',
        weather: weatherService.isConfigured() ? 'configured' : 'not_configured',
      },
    });
  });

  app.use('/api/auth', authRoutes);

  app.use(requireDB); // everything below needs Mongo
  app.use('/api/farmer', farmerRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/readings', readingRoutes);
  app.use('/api/passport', passportRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/dao', daoRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use((req, res) => res.status(404).json({ success: false, error: 'not_found' }));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
