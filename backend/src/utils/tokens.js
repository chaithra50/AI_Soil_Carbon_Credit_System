const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, ver: user.refreshTokenVersion },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL }
  );
}

const REFRESH_COOKIE_NAME = 'agc_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  };
}

module.exports = { signAccessToken, signRefreshToken, REFRESH_COOKIE_NAME, refreshCookieOptions };
