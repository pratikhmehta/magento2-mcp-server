import nodemailer from 'nodemailer';
import axios from 'axios';
import { config } from '../config.js';

/**
 * Notifier Handler
 * Manages multi-channel alerts (Email, Slack, Webhook)
 */

/**
 * Sends an alert through configured channels based on alert type
 * @param {object} alert 
 */
export async function sendAlert(alert) {
  const { type } = alert;

  const results = [];
  if (type === 'low_stock') {
    results.push(sendEmail(alert));
    results.push(sendSlack(alert));
  } else if (type === 'order_event') {
    results.push(sendWebhook(alert));
  } else {
    console.warn(`⚠️ Unknown alert type: ${type}`);
  }

  // Ensure all channels finish and report errors
  const settled = await Promise.allSettled(results);
  const failures = settled.filter(r => r.status === 'rejected');
  
  if (failures.length > 0) {
    throw new Error(`Failed to send alert to ${failures.length} channels: ${failures.map(f => f.reason).join(', ')}`);
  }
}

/**
 * Sends an email alert using SMTP
 */
async function sendEmail(alert) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL } = config;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL) {
    console.warn('⚠️ Email alert skipped: SMTP credentials or ALERT_EMAIL missing.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: `"Magento MCP" <${SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject: alert.subject,
      text: alert.body,
      html: `<p>${alert.body.replace(/\n/g, '<br>')}</p>`
    });
    console.error(`📧 Email alert sent: ${alert.subject}`);
  } catch (error) {
    throw new Error(`Email failed: ${error.message}`);
  }
}

/**
 * Sends a Slack notification using Incoming Webhooks
 */
async function sendSlack(alert) {
  const { SLACK_WEBHOOK_URL } = config;

  if (!SLACK_WEBHOOK_URL) {
    console.warn('⚠️ Slack alert skipped: SLACK_WEBHOOK_URL missing.');
    return;
  }

  try {
    const blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*🚨 Magento Alert: ${alert.subject}*` }
      },
      {
        type: "section",
        text: { type: "plain_text", text: alert.body }
      }
    ];

    await axios.post(SLACK_WEBHOOK_URL, { blocks });
    console.error(`💬 Slack alert sent: ${alert.subject}`);
  } catch (error) {
    throw new Error(`Slack failed: ${error.message}`);
  }
}

/**
 * Sends a generic webhook notification
 */
async function sendWebhook(alert) {
  const { ALERT_WEBHOOK_URL } = config;

  if (!ALERT_WEBHOOK_URL) {
    console.warn('⚠️ Webhook alert skipped: ALERT_WEBHOOK_URL missing.');
    return;
  }

  try {
    await axios.post(ALERT_WEBHOOK_URL, {
      source: 'magento2-mcp-server',
      timestamp: new Date().toISOString(),
      ...alert
    });
    console.error(`🔗 Webhook alert sent: ${alert.type}`);
  } catch (error) {
    throw new Error(`Webhook failed: ${error.message}`);
  }
}
