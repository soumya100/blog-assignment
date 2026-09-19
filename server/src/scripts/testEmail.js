/**
 * DevLog SMTP / Email Delivery Diagnostic Tool
 * 
 * Safely audits environment configuration, tests SMTP transport handshake,
 * and optionally sends a verification test email.
 * 
 * Usage:
 *   node src/scripts/testEmail.js [recipient@example.com]
 */

const env = require('../config/env');
const logger = require('../utils/logger');
const { getTransporter, sendPasswordRecoveryEmail, verifyEmailTransport, maskEmail } = require('../utils/emailService');

const runDiagnostics = async () => {
  console.log('\n======================================================');
  console.log('       DevLog SMTP / Email Diagnostic Tool');
  console.log('======================================================\n');

  const emailUser = env.EMAIL_USER || env.SMTP_USER;
  const emailPass = env.EMAIL_PASS || env.SMTP_PASS;

  console.log('1. Auditing Environment Configuration:');
  console.log(`   - NODE_ENV:      ${env.NODE_ENV}`);
  console.log(`   - SMTP_HOST:     ${env.SMTP_HOST || '(not set - using default)'}`);
  console.log(`   - SMTP_PORT:     ${env.SMTP_PORT}`);
  console.log(`   - SMTP_SECURE:   ${env.SMTP_SECURE}`);
  console.log(`   - SMTP_USER:     ${emailUser ? maskEmail(emailUser) : '(NOT CONFIGURED)'}`);
  console.log(`   - SMTP_PASSWORD: ${emailPass ? '******** (configured)' : '(NOT CONFIGURED)'}`);
  console.log(`   - SMTP_FROM:     ${env.SMTP_FROM || env.EMAIL_FROM || '(defaulting to DevLog Security)'}`);

  const hasCredentials = Boolean(emailUser && emailPass);

  if (!hasCredentials) {
    console.log('\n⚠️  WARNING: Real SMTP credentials are NOT configured.');
    console.log('   Any emails dispatched will be captured by the Ethereal sandbox');
    console.log('   and will NOT be received in real Gmail inboxes.');
    console.log('\n   To enable real Gmail delivery:');
    console.log('   1. Open your Google Account -> Security -> 2-Step Verification.');
    console.log('   2. Create an App Password at: https://myaccount.google.com/apppasswords');
    console.log('   3. Set the following in your .env file:');
    console.log('      SMTP_HOST=smtp.gmail.com');
    console.log('      SMTP_PORT=587');
    console.log('      SMTP_SECURE=false');
    console.log('      SMTP_USER=your_email@gmail.com');
    console.log('      SMTP_PASSWORD=your_16_character_app_password');
    console.log('      SMTP_FROM="DevLog Security" <your_email@gmail.com>\n');
  } else {
    console.log('\n✓ Real SMTP credentials detected in environment.');
  }

  console.log('2. Testing Transport Connection & Handshake:');
  try {
    const transporter = await getTransporter();
    console.log('   Transporter initialized successfully.');

    await verifyEmailTransport();
    console.log('   ✓ SMTP handshake verified: Connection and authentication succeeded!\n');
  } catch (verifyErr) {
    console.error(`   ✗ SMTP handshake failed: ${verifyErr.message}`);
    if (verifyErr.message.includes('535') || verifyErr.message.includes('EAUTH')) {
      console.error('\n   💡 Diagnostic Tip: Google rejected your credentials (Error 535).');
      console.error('      Make sure you are using a 16-character Google App Password,');
      console.error('      NOT your standard Google account login password.');
    } else if (verifyErr.code === 'ETIMEDOUT' || verifyErr.code === 'ECONNREFUSED') {
      console.error('\n   💡 Diagnostic Tip: Connection timed out or was refused.');
      console.error('      If your ISP/network blocks port 465, try SMTP_PORT=587 with SMTP_SECURE=false.');
    }
    process.exit(1);
  }

  // Optional live test email
  const targetRecipient = process.argv[2];
  if (targetRecipient) {
    console.log(`3. Sending Test Password Recovery Email to ${maskEmail(targetRecipient)}:`);
    try {
      const result = await sendPasswordRecoveryEmail({
        to: targetRecipient,
        otp: '123456',
        resetUrl: `${env.CLIENT_URL}/reset-password/sample-diagnostic-token`,
        username: 'Diagnostic Tester',
      });

      console.log('   ✓ Test email accepted by transport provider!');
      console.log(`   Message ID: ${result.messageId}`);
      if (result.previewUrl) {
        console.log(`   Ethereal Preview URL: ${result.previewUrl}`);
      } else {
        console.log(`   Delivered directly via SMTP to ${maskEmail(targetRecipient)}`);
      }
    } catch (sendErr) {
      console.error(`   ✗ Failed to send test email: ${sendErr.message}`);
      process.exit(1);
    }
  } else {
    console.log('3. Live Email Dispatch: Skipped (no recipient specified).');
    console.log('   To test real dispatch, run: node src/scripts/testEmail.js your_test@gmail.com');
  }

  console.log('\n======================================================');
  console.log('               Diagnostics Completed');
  console.log('======================================================\n');
};

runDiagnostics().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
