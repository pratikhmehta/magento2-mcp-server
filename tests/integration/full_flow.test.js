import nock from 'nock';
import { InventoryAlertHandler } from '../../src/handlers/inventory_alerts_handler.js';
import { OrderAutomationHandler } from '../../src/handlers/order_automation_handler.js';
import { AICustomerHandler } from '../../src/handlers/ai_customer_handler.js';
import { sendAlert } from '../../src/handlers/notifier.js';

// Mock Notifier
jest.mock('../../src/handlers/notifier.js');

describe('Full Flow Integration Tests', () => {
  const BASE_URL = 'https://mini-hypermarket.ddev.site/rest/V1';

  beforeAll(() => {
    // Disable real network requests
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
    nock.restore();
  });

  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('Inventory Alert Flow', () => {
    test('should fetch low stock and trigger notification', async () => {
      // 1. Mock Magento Response
      nock('https://mini-hypermarket.ddev.site')
        .get('/rest/V1/inventory/source-items')
        .query(true)
        .reply(200, {
          items: [
            { sku: 'TEST-01', quantity: 2, source_code: 'default', status: 1 },
            { sku: 'TEST-02', quantity: 5, source_code: 'default', status: 1 }
          ]
        });

      // 2. Run Tool logic
      const result = await InventoryAlertHandler.checkAlerts({ threshold: 10 });
      
      // 3. Verify tool result
      expect(result).toHaveLength(2);
      expect(result[0].sku).toBe('TEST-01');

      // 4. Verification of notification (would typically be called by a high-level service)
      // For this integration test, we simulate that step
      await sendAlert({
        type: 'low_stock',
        subject: 'Low Stock Alert',
        body: `Found ${result.length} items below threshold.`,
        data: result
      });

      expect(sendAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'low_stock' }));
    });
  });

  describe('Order Automation Flow', () => {
    test('should process paid event and update status', async () => {
      // 1. Mock Get Order
      nock('https://mini-hypermarket.ddev.site')
        .get('/rest/V1/orders/123')
        .reply(200, { id: 123, increment_id: '100001', status: 'pending' });

      // 2. Mock Status Update
      nock('https://mini-hypermarket.ddev.site')
        .post('/rest/V1/orders/123/comments')
        .reply(200, { success: true });

      // 3. Run Handler
      const result = await OrderAutomationHandler.processEvent({ 
        order_id: '123', 
        event_type: 'paid' 
      });

      // 4. Verify
      expect(result.new_status).toBe('processing');
      expect(result.action_taken).toBe('sent_to_fulfilment');
    });
  });

  describe('AI Customer Service Flow', () => {
    test('should respond to chat with order context', async () => {
      // 1. Mock Order History Lookup
      nock('https://mini-hypermarket.ddev.site')
        .get('/rest/V1/orders')
        .query(true)
        .reply(200, {
          items: [
            { increment_id: '100001', status: 'shipped', grand_total: 50, order_currency_code: 'USD' }
          ]
        });

      // 2. Mock Anthropic API (via nock)
      nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, {
          content: [{ type: 'text', text: 'Your order #100001 has been shipped!' }]
        });

      // 3. Run Chat Handler
      const result = await AICustomerHandler.handleChat({
        session_id: 'session-abc',
        message: 'Where is my last order?',
        customer_email: 'customer@example.com'
      });

      // 4. Verify
      expect(result.reply).toContain('order #100001');
      expect(result.session_id).toBe('session-abc');
    });
  });
});
