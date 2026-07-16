const crypto = require('crypto');

/** Generate a 6-digit numeric OTP as a zero-padded string. */
function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/** OTPs expire 10 minutes after issue. */
function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

module.exports = { generateOtp, otpExpiry };
