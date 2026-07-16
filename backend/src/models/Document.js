const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    docType: { type: String, enum: ['aadhaar', 'land_ownership', 'farm_image', 'crop_image'], required: true },

    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true }, // always computed, regardless of storage backend

    storage: {
      backend: { type: String, enum: ['ipfs_web3storage', 'ipfs_pinata', 'local_fallback'], required: true },
      cid: { type: String, default: null }, // set only when backend is an ipfs_* variant
      localPath: { type: String, default: null }, // set only when backend is local_fallback
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
