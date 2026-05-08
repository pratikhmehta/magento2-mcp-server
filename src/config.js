import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Configuration Schema
 * Validates and sanitizes environment variables for the Magento MCP server
 */
const configSchema = z.object({
  // Magento API
  MAGENTO_BASE_URL: z.string().url(),
  MAGENTO_TOKEN: z.string().min(1),
  
  // AI
  GEMINI_API_KEY: z.string().min(1),
  
  // Notification Channels
  ALERT_EMAIL: z.string().email(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  
  // Operational
  FULFILMENT_ENDPOINT: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().default('3000'),
});

const envResult = configSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Environment validation failed:', JSON.stringify(envResult.error.format(), null, 2));
  process.exit(1);
}

export const config = envResult.data;
