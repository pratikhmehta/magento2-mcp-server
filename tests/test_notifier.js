import { sendAlert } from './src/handlers/notifier.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAlert() {
  console.log('🚀 Starting Email Alert Test...');
  
  const testAlert = {
    type: 'low_stock',
    subject: '🧪 MCP Test: High Value Order Detected',
    body: 'This is a test notification from the Magento MCP Server.\n\nOrder #211000000256 has been detected with a total of 55,036 MNT.'
  };

  try {
    await sendAlert(testAlert);
    console.log('✅ Test alert sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test alert:', error.message);
  }
}

testAlert();
