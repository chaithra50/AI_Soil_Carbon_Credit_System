const mongoose = require('mongoose');

const polygonPointSchema = new mongoose.Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const farmerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    fullName: { type: String, required: true, trim: true },
    aadhaarNumber: { type: String, trim: true }, // stored, never validated against a real registry here
    landSurveyNumber: { type: String, trim: true },

    farm: {
      name: { type: String, trim: true },
      village: { type: String, trim: true },
      taluk: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      pinCode: { type: String, trim: true },
      boundary: { type: [polygonPointSchema], default: [] }, // drawn polygon, lat/lng pairs
      areaHectares: { type: Number, default: 0 }, // computed client-side via Turf.js, stored here
      centroid: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },

    agriculture: {
      cropType: { type: String, trim: true }, // must match carbonScoring.RECOGNIZED_CROPS
      farmingMethod: { type: String, trim: true }, // must match carbonScoring.RECOGNIZED_METHODS
      soilType: { type: String, trim: true },
      irrigationMethod: { type: String, trim: true },
      previousCrop: { type: String, trim: true },
      organicCertified: { type: Boolean, default: false },
    },

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    walletCreditsBalance: { type: Number, default: 0 }, // credits available to list on marketplace
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farmer', farmerSchema);
