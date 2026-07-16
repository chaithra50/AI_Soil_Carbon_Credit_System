const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'company', 'admin'], required: true },

    isEmailVerified: { type: Boolean, default: false },
    otpCodeHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },

    // farmer-specific verification lifecycle (admin approval)
    verificationStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'approved', 'rejected'],
      default: function () {
        return this.role === 'farmer' ? 'pending' : 'not_applicable';
      },
    },
    verificationReason: { type: String, default: null },

    refreshTokenVersion: { type: Number, default: 0 }, // bump to invalidate all refresh tokens
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const { _id, email, phone, role, isEmailVerified, verificationStatus, createdAt } = this;
  return { id: _id, email, phone, role, isEmailVerified, verificationStatus, createdAt };
};

module.exports = mongoose.model('User', userSchema);
