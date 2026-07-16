const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },

    // Only 'baseline' and 'completion' feed the scoring engine. 'routine' is dashboard-only.
    readingType: { type: String, enum: ['baseline', 'completion', 'routine'], required: true },

    recordedAt: { type: Date, required: true, default: Date.now },

    metrics: {
      soilMoisture: { type: Number, default: null }, // %
      temperature: { type: Number, default: null }, // Celsius
      humidity: { type: Number, default: null }, // %
      soilOrganicCarbon: { type: Number, default: null }, // % - primary sequestration signal
      ph: { type: Number, default: null },
      nitrogen: { type: Number, default: null },
      phosphorus: { type: Number, default: null },
      potassium: { type: Number, default: null },
      vegetationNote: { type: String, default: null }, // free-text, image-based cross-check is out of scope
    },

    weather: {
      status: { type: String, enum: ['not_configured', 'ok', 'error'], default: 'not_configured' },
      rainfallMm: { type: Number, default: null },
      tempC: { type: Number, default: null },
      humidityPct: { type: Number, default: null },
      fetchedAt: { type: Date, default: null },
    },

    source: { type: String, enum: ['manual_form', 'mqtt_simulator'], default: 'manual_form' },

    usedInScore: { type: Boolean, default: false },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'CarbonCycle', default: null },
  },
  {
    timeseries: {
      timeField: 'recordedAt',
      metaField: 'farmer',
      granularity: 'hours',
    },
    timestamps: { createdAt: true, updatedAt: false },
  }
);

sensorReadingSchema.index({ farmer: 1, readingType: 1, usedInScore: 1, recordedAt: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
