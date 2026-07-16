const mongoose = require('mongoose');

const carbonCycleSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },

    baselineReading: { type: mongoose.Schema.Types.ObjectId, ref: 'SensorReading', required: true },
    completionReading: { type: mongoose.Schema.Types.ObjectId, ref: 'SensorReading', required: true },

    score: {
      value: { type: Number, required: true }, // 0-100
      carbonStoredTons: { type: Number, required: true },
      creditsEarned: { type: Number, required: true }, // 1 credit == 1 ton CO2e, per spec's conversion rule
      confidence: { type: Number, required: true }, // 0-1
      direction: { type: String, enum: ['improvement', 'decline', 'flat'], required: true },
      explanation: { type: String, required: true },
    },

    chain: {
      status: {
        type: String,
        enum: ['not_configured', 'pending', 'confirmed', 'failed'],
        default: 'not_configured',
      },
      txHash: { type: String, default: null },
      contractAddress: { type: String, default: null },
      recordedAt: { type: Date, default: null },
      error: { type: String, default: null },
    },

    listedOnMarketplace: { type: Boolean, default: false },
    creditsRemaining: { type: Number, default: 0 }, // decrements as sold; starts == creditsEarned once listed
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarbonCycle', carbonCycleSchema);
