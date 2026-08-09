require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { verifyTransporter, sendmail } = require('../src/modules/notifications/lib/emailService');

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('Usage: node tools/sendTestEmail.js <your-email@example.com>');
  process.exit(1);
}

(async () => {
  console.log('🔍 Verifying SMTP connection...');
  const ok = await verifyTransporter();
  if (!ok) {
    console.error('❌ SMTP verification failed!');
    process.exit(1);
  }

  console.log(`📧 Sending test email to: ${targetEmail}...`);
  try {
    const result = await sendmail(targetEmail, '123456');
    console.log('✅ Test email sent successfully!', result.messageId || result);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
  }
})();
