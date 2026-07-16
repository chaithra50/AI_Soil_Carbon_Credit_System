const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    votingClosesAt: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    result: { type: String, enum: ['pending', 'passed', 'rejected'], default: 'pending' },

    yesCount: { type: Number, default: 0 },
    noCount: { type: Number, default: 0 },

    chain: {
      status: { type: String, enum: ['not_configured', 'pending', 'confirmed', 'failed'], default: 'not_configured' },
      txHash: { type: String, default: null },
    },
  },
  { timestamps: true }
);

const voteSchema = new mongoose.Schema(
  {
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    choice: { type: String, enum: ['yes', 'no'], required: true },
  },
  { timestamps: true }
);
voteSchema.index({ proposal: 1, voter: 1 }, { unique: true }); // one vote per user per proposal

module.exports = {
  Proposal: mongoose.model('Proposal', proposalSchema),
  Vote: mongoose.model('Vote', voteSchema),
};
