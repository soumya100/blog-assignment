const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let cachedTransporter = null;

/**
 * HTML entity escaping for user input interpolation into email templates
 */
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Mask email address for safe diagnostic logging
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
};

/**
 * Obtain or create a real SMTP nodemailer transporter.
 * If SMTP credentials exist in env, uses them (supporting Gmail and custom SMTP hosts).
 * Otherwise, provisions an Ethereal SMTP sandbox account in dev/test, or throws in production.
 */
const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const emailUser = env.EMAIL_USER || env.SMTP_USER;
  const emailPass = env.EMAIL_PASS || env.SMTP_PASS;

  if (emailUser && emailPass) {
    const cleanPass = emailPass.replace(/\s+/g, ''); // Strip spaces from Google App Passwords
    const isGmail =
      emailUser.toLowerCase().includes('@gmail.com') ||
      (env.SMTP_HOST && env.SMTP_HOST.toLowerCase().includes('gmail.com')) ||
      env.SMTP_SERVICE === 'gmail';

    // 1. Explicit SMTP Host Configuration (e.g. smtp.gmail.com with custom port/secure settings)
    if (env.SMTP_HOST) {
      const port = env.SMTP_PORT || (env.SMTP_SECURE ? 465 : 587);
      const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : port === 465;

      logger.info(`[EmailService] Configuring SMTP transport: ${env.SMTP_HOST}:${port} (secure: ${secure}, user: ${maskEmail(emailUser)})`);
      cachedTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: emailUser,
          pass: cleanPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      return cachedTransporter;
    }

    // 2. Built-in Gmail Service Transport (defaulting to port 465 / SSL)
    if (isGmail) {
      logger.info(`[EmailService] Configuring Gmail service for ${maskEmail(emailUser)}`);
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: cleanPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      return cachedTransporter;
    }
  }

  // In production, failure to configure real SMTP is fatal
  if (env.NODE_ENV === 'production') {
    const error = new Error('SMTP credentials are not configured in production environment.');
    logger.error(`[EmailService] ${error.message}`);
    throw error;
  }

  // Development / Test fallback: Ethereal Sandbox
  logger.warn('[EmailService] NOTICE: Real SMTP credentials (SMTP_USER / SMTP_PASSWORD) not configured in .env.');
  logger.warn('[EmailService] Falling back to Ethereal sandbox test account. EMAILS WILL NOT BE DELIVERED TO REAL GMAIL INBOXES.');

  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`[EmailService] Generated live Ethereal sandbox account: ${testAccount.user}`);
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    logger.error(`[EmailService] Failed to create Ethereal SMTP account: ${err.message}. Falling back to JSON log transport.`);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
};

/**
 * Reset cached transporter (useful for testing and configuration changes)
 */
const resetTransporter = () => {
  cachedTransporter = null;
};

/**
 * Verify current email transport connection and authentication
 */
const verifyEmailTransport = async () => {
  const transporter = await getTransporter();
  return transporter.verify();
};

/**
 * Send Password Recovery Email containing 6-digit OTP code & 1-click Magic Link
 */
const sendPasswordRecoveryEmail = async ({ to, otp, resetUrl, username }) => {
  try {
    const transporter = await getTransporter();
    const emailUser = env.EMAIL_USER || env.SMTP_USER;
    const fromAddress = env.EMAIL_FROM || env.SMTP_FROM || (emailUser ? `"DevLog Security" <${emailUser}>` : '"DevLog Security" <security@blogplatform.dev>');

    const safeUsername = escapeHtml(username) || 'Developer';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevLog Account Recovery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #334155;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px;">
                      DevLog<span style="color: #818cf8;">.platform</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #94a3b8; background: #0f172a; padding: 4px 10px; border-radius: 999px; border: 1px solid #334155; text-transform: uppercase; letter-spacing: 0.05em;">
                      Security Code
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                Account Recovery Verification
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${safeUsername}</strong>,<br>
                We received a request to access your DevLog account. Enter the 6-digit one-time passcode below into the verification prompt:
              </p>

              <!-- 6-digit OTP Box -->
              <div style="background: #0f172a; border: 1.5px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #60a5fa; margin-bottom: 8px; font-weight: 600;">
                  One-Time Verification Code
                </div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace;">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                  Expires in 10 minutes • Single-use only
                </div>
              </div>

              <!-- Magic Link Divider -->
              <div style="margin: 28px 0; text-align: center; position: relative;">
                <hr style="border: 0; border-top: 1px solid #334155;">
                <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #1e293b; padding: 0 12px; font-size: 12px; color: #64748b; font-weight: 600;">
                  OR USE 1-CLICK MAGIC LINK
                </span>
              </div>

              <!-- Magic Link Button -->
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                  Reset Password with Magic Link →
                </a>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.6; color: #64748b; text-align: center;">
                If you did not make this request, please disregard this email. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                DevLog Enterprise Security • Zero-Trust Identity Infrastructure
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Your DevLog Account Recovery Code: ${otp}`,
      text: `Your DevLog recovery code is: ${otp}\n\nAlternatively, reset your password using this link: ${resetUrl}\n\nThis code expires in 10 minutes.`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    logger.info(`[EmailService] Recovery email dispatched to ${maskEmail(to)} (MessageId: ${info.messageId})`);
    if (previewUrl) {
      logger.info(`[EmailService] Ethereal Development Sandbox Link: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    logger.error(`[EmailService] Failed to send email to ${maskEmail(to)}: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendPasswordRecoveryEmail,
  getTransporter,
  resetTransporter,
  verifyEmailTransport,
  maskEmail,
};
