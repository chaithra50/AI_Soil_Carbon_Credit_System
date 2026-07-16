require('dotenv').config();

function bool(v) {
  return Boolean(v && String(v).trim().length > 0);
}

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/agricarbon',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '7d',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',

  WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN || '',
  PINATA_JWT: process.env.PINATA_JWT || '',

  POLYGON_AMOY_RPC_URL: process.env.POLYGON_AMOY_RPC_URL || '',
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || '',
  CARBON_REGISTRY_ADDRESS: process.env.CARBON_REGISTRY_ADDRESS || '',

  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',

  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || '',
};

env.flags = {
  emailConfigured: bool(env.RESEND_API_KEY),
  ipfsConfigured: bool(env.WEB3_STORAGE_TOKEN) || bool(env.PINATA_JWT),
  blockchainConfigured:
    bool(env.POLYGON_AMOY_RPC_URL) && bool(env.DEPLOYER_PRIVATE_KEY) && bool(env.CARBON_REGISTRY_ADDRESS),
  weatherConfigured: bool(env.OPENWEATHER_API_KEY),
  mqttConfigured: bool(env.MQTT_BROKER_URL),
};

module.exports = env;
