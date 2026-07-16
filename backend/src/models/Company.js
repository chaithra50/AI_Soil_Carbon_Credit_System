const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    carbonCreditRequirement: { type: Number, default: 0 }, // stated annual target, informational

    creditsOwned: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
