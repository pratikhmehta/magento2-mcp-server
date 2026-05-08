import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testEmailDirect() {
  console.log('🚀 Starting Direct Email Test (bypassing Zod)...');
  
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL) {
    console.error('❌ Missing environment variables for SMTP.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    const info = await transporter.sendMail({
      from: `"Magento MCP Test" <${SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject: '🧪 Standalone Test: Email System Working',
      text: 'This email confirms that the SMTP credentials in your .env file are correct and the server can send emails.',
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
}

testEmailDirect();
