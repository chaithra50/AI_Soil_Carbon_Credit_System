const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'CarbonCycle', required: true },

    creditsTotal: { type: Number, required: true },
    creditsRemaining: { type: Number, required: true },
    pricePerCreditINR: { type: Number, required: true },

    status: { type: String, enum: ['active', 'sold_out', 'withdrawn'], default: 'active' },
  },
  { timestamps: true }
);

const transactionSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceListing', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

    creditsPurchased: { type: Number, required: true },
    pricePerCreditINR: { type: Number, required: true },
    totalPaidINR: { type: Number, required: true }, // payment is simulated, no real gateway

    chain: {
      status: { type: String, enum: ['not_configured', 'pending', 'confirmed', 'failed'], default: 'not_configured' },
      txHash: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = {
  MarketplaceListing: mongoose.model('MarketplaceListing', listingSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
};
