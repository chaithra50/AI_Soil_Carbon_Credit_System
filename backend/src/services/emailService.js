const env = require('../config/env');

let resendClient = null;
if (env.flags.emailConfigured) {
  // Lazy require so the dependency is only touched when actually configured.
  const { Resend } = require('resend');
  resendClient = new Resend(env.RESEND_API_KEY);
}

/**
 * Sends an OTP email. Returns { status: 'sent' | 'console_fallback' | 'error', ... }
 * Never throws - callers should not have to try/catch to stay up.
 */
async function sendOtpEmail(toEmail, otpCode) {
  if (!env.flags.emailConfigured) {
    console.log(`[email:console_fallback] OTP for ${toEmail}: ${otpCode} (expires in 10 min)`);
    return { status: 'console_fallback' };
  }

  try {
    await resendClient.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: 'Your AgriCarbon DAO verification code',
      html: `<p>Your verification code is <b>${otpCode}</b>. It expires in 10 minutes.</p>`,
    });
    return { status: 'sent' };
  } catch (err) {
    console.error(`[email:error] Resend send failed: ${err.message}; falling back to console`);
    console.log(`[email:console_fallback] OTP for ${toEmail}: ${otpCode}`);
    return { status: 'error', error: err.message };
  }
}

/** Generic notification email (verification approved, credits sold, etc). Never throws. */
async function sendNotificationEmail(toEmail, subject, message) {
  if (!env.flags.emailConfigured) {
    console.log(`[email:console_fallback] "${subject}" -> ${toEmail}: ${message}`);
    return { status: 'console_fallback' };
  }
  try {
    await resendClient.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject,
      html: `<p>${message}</p>`,
    });
    return { status: 'sent' };
  } catch (err) {
    console.error(`[email:error] ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

module.exports = { sendOtpEmail, sendNotificationEmail, isConfigured: () => env.flags.emailConfigured };
