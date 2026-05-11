import nodemailer from "nodemailer";
import axios from "axios";
import { config } from "../config.js";
import { createRateLimiter } from "../lib/rate_limiter.js";

// Strict rate limit for email alerts (VAPT Protection)
const emailLimiter = createRateLimiter("email", { max_per_minute: 5 });

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

  // Background execution to prevent MCP from hanging during slow SMTP/API calls
  const executeAlert = async () => {
    try {
      const results = [];
      if (
        type === "low_stock" ||
        type === "high_value_orders" ||
        type === "high_value_products" ||
        type === "top_customers"
      ) {
        results.push(sendEmail(alert));
        results.push(sendSlack(alert));
      } else if (type === "order_event") {
        results.push(sendWebhook(alert));
      } else {
        console.warn(`WARNING: Unknown alert type: ${type}`);
      }

      await Promise.allSettled(results);
    } catch (error) {
      console.error(`ERROR: Background alert failed: ${error.message}`);
    }
  };

  // Trigger in background and return immediately
  executeAlert();
  return { status: "alert_triggered_in_background" };
}

/**
 * Sends an email alert using SMTP
 */
async function sendEmail(alert) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL } = config;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ALERT_EMAIL) {
    console.warn(
      "WARNING: Email alert skipped: SMTP credentials or ALERT_EMAIL missing.",
    );
    return;
  }

  // VAPT: Prevent flooding
  const rateLimitStatus = emailLimiter.check("global_email");
  if (!rateLimitStatus.allowed) {
    console.error(
      `STOP: Rate limit exceeded for email. Skipping alert: ${alert.subject}`,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    // Escape HTML to prevent XSS in email clients
    const escapeHtml = (unsafe) =>
      String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const mailOptions = {
      from: `"Magento MCP" <${SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject: alert.subject,
      text: alert.body,
      html: `<p>${escapeHtml(alert.body).replace(/\n/g, "<br>")}</p>`,
      attachments: [],
    };

    // Add CSV attachment if data is provided
    if (alert.csvData) {
      mailOptions.attachments.push({
        filename: `${alert.type || "report"}_${new Date().getTime()}.csv`,
        content: alert.csvData,
      });
    }

    await transporter.sendMail(mailOptions);
    console.error(`EMAIL: Email alert sent: ${alert.subject}`);
  } catch (error) {
    throw new Error(`Email failed: ${error.message}`);
  }
}

// Strict rate limit for Slack alerts (VAPT Protection)
const slackLimiter = createRateLimiter("slack", { max_per_minute: 5 });

/**
 * Sends a Slack notification using Incoming Webhooks
 */
async function sendSlack(alert) {
  const { SLACK_WEBHOOK_URL } = config;

  if (!SLACK_WEBHOOK_URL) {
    console.warn("WARNING: Slack alert skipped: SLACK_WEBHOOK_URL missing.");
    return;
  }

  // VAPT: Prevent flooding
  const rateLimitStatus = slackLimiter.check("global_slack");
  if (!rateLimitStatus.allowed) {
    console.error(
      `STOP: Rate limit exceeded for Slack. Skipping alert: ${alert.subject}`,
    );
    return;
  }

  try {
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*ALERT: Magento Alert: ${alert.subject}*`,
        },
      },
      {
        type: "section",
        text: { type: "plain_text", text: alert.body },
      },
    ];

    await axios.post(SLACK_WEBHOOK_URL, { blocks });
    console.error(`SLACK: Slack alert sent: ${alert.subject}`);
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
    console.warn("WARNING: Webhook alert skipped: ALERT_WEBHOOK_URL missing.");
    return;
  }

  try {
    await axios.post(ALERT_WEBHOOK_URL, {
      source: "magento2-mcp-server",
      timestamp: new Date().toISOString(),
      ...alert,
    });
    console.error(`WEBHOOK: Webhook alert sent: ${alert.type}`);
  } catch (error) {
    throw new Error(`Webhook failed: ${error.message}`);
  }
}
