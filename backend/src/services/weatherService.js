const axios = require('axios');
const env = require('../config/env');

/**
 * Fetches current weather for a lat/lng. Always resolves (never rejects)
 * with a shape matching SensorReading.weather.
 */
async function fetchWeather(lat, lng) {
  if (!env.flags.weatherConfigured) {
    return { status: 'not_configured', rainfallMm: null, tempC: null, humidityPct: null, fetchedAt: null };
  }

  try {
    const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon: lng, appid: env.OPENWEATHER_API_KEY, units: 'metric' },
      timeout: 8000,
    });
    const data = res.data;
    return {
      status: 'ok',
      rainfallMm: data.rain ? data.rain['1h'] || 0 : 0,
      tempC: data.main?.temp ?? null,
      humidityPct: data.main?.humidity ?? null,
      fetchedAt: new Date(),
    };
  } catch (err) {
    console.error(`[weather] fetch failed: ${err.message}`);
    return { status: 'error', rainfallMm: null, tempC: null, humidityPct: null, fetchedAt: null };
  }
}

module.exports = { fetchWeather, isConfigured: () => env.flags.weatherConfigured };
