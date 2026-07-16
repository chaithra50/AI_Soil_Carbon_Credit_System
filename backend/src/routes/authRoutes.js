const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Company = require('../models/Company');
const ApiError = require('../utils/apiError');
const { generateOtp, otpExpiry } = require('../utils/otp');
const { sendOtpEmail } = require('../services/emailService');
const { signAccessToken, signRefreshToken, REFRESH_COOKIE_NAME, refreshCookieOptions } = require('../utils/tokens');
const env = require('../config/env');

const router = express.Router();

// --- Register (role: farmer | company) ---
router.post('/register', async (req, res) => {
  const { email, password, phone, role, fullName, companyName } = req.body;

  if (!email || !password || !role) throw ApiError.badRequest('email, password, and role are required');
  if (!['farmer', 'company'].includes(role)) throw ApiError.badRequest('role must be farmer or company');
  if (password.length < 8) throw ApiError.badRequest('password must be at least 8 characters');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = new User({ email: email.toLowerCase(), phone, role });
  await user.setPassword(password);

  const otp = generateOtp();
  user.otpCodeHash = await bcrypt.hash(otp, 10);
  user.otpExpiresAt = otpExpiry();
  await user.save();

  if (role === 'farmer') {
    await Farmer.create({ user: user._id, fullName: fullName || email });
  } else {
    await Company.create({ user: user._id, companyName: companyName || email });
  }

  const emailResult = await sendOtpEmail(user.email, otp);

  res.status(201).json({
    success: true,
    message:
      emailResult.status === 'sent'
        ? 'Registered. Check your email for the verification code.'
        : 'Registered. Email is not configured on this server, so your code is shown below.',
    emailDelivery: emailResult.status, // 'sent' | 'console_fallback' | 'error'
    // Only ever included when there's no real email to deliver it — never sent alongside emailDelivery: 'sent'.
    devOtp: env.flags.emailConfigured ? undefined : otp,
  });
});

// --- Verify OTP ---
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) throw ApiError.badRequest('email and code are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.notFound('No account with this email');
  if (user.isEmailVerified) return res.json({ success: true, message: 'Already verified' });

  if (!user.otpCodeHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw ApiError.badRequest('OTP expired, please request a new one');
  }
  if (user.otpAttempts >= 5) throw ApiError.badRequest('Too many attempts, request a new OTP');

  const match = await bcrypt.compare(code, user.otpCodeHash);
  if (!match) {
    user.otpAttempts += 1;
    await user.save();
    throw ApiError.badRequest('Incorrect code');
  }

  user.isEmailVerified = true;
  user.otpCodeHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  await user.save();

  res.json({ success: true, message: 'Email verified. You can now log in.' });
});

router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) throw ApiError.notFound('No account with this email');
  if (user.isEmailVerified) return res.json({ success: true, message: 'Already verified' });

  const otp = generateOtp();
  user.otpCodeHash = await bcrypt.hash(otp, 10);
  user.otpExpiresAt = otpExpiry();
  user.otpAttempts = 0;
  await user.save();

  const emailResult = await sendOtpEmail(user.email, otp);
  res.json({
    success: true,
    emailDelivery: emailResult.status,
    devOtp: env.flags.emailConfigured ? undefined : otp,
  });
});

// --- Login ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  if (!user.isEmailVerified) throw ApiError.forbidden('Email not verified. Check your inbox for the OTP.');

  if (user.role === 'farmer' && user.verificationStatus === 'rejected') {
    throw ApiError.forbidden('Your farmer application was rejected. Contact support.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.json({ success: true, accessToken, user: user.toSafeJSON() });
});

// --- Refresh access token from httpOnly cookie ---
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.ver) throw ApiError.unauthorized('Refresh token revoked');

  const accessToken = signAccessToken(user);
  res.json({ success: true, accessToken });
});

// --- Logout: bump refresh token version to invalidate all outstanding refresh tokens ---
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
      await User.findByIdAndUpdate(payload.sub, { $inc: { refreshTokenVersion: 1 } });
    } catch (err) {
      // token unreadable - nothing to revoke, fall through to clearing the cookie
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ success: true });
});

module.exports = router;
