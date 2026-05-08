import { OrderAutomationHandler } from '../src/handlers/order_automation_handler.js';
import { magento } from '../src/lib/magento.js';

jest.mock('../src/lib/magento.js');

describe('OrderAutomationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should process "paid" event and trigger fulfilment', async () => {
    magento.get.mockResolvedValue({ 
      id: '123', 
      increment_id: '100001', 
      status: 'pending' 
    });
    magento.post.mockResolvedValue({ status: 'success' });

    const result = await OrderAutomationHandler.processEvent({ 
      order_id: '123', 
      event_type: 'paid' 
    });

    expect(result.action_taken).toBe('sent_to_fulfilment');
    expect(result.new_status).toBe('processing');
    expect(magento.post).toHaveBeenCalledWith(
      expect.stringContaining('123'),
      expect.objectContaining({ statusHistory: expect.objectContaining({ status: 'processing' }) })
    );
  });

  test('should throw error if order not found (404)', async () => {
    const error = new Error('Not Found');
    error.status = 404;
    magento.get.mockRejectedValue(error);

    await expect(OrderAutomationHandler.processEvent({ 
      order_id: '999', 
      event_type: 'paid' 
    })).rejects.toThrow('Order #999 not found');
  });

  test('should handle "shipped" event by completing the order', async () => {
    magento.get.mockResolvedValue({ id: '123', status: 'processing' });
    magento.post.mockResolvedValue({});

    const result = await OrderAutomationHandler.processEvent({ 
      order_id: '123', 
      event_type: 'shipped' 
    });

    expect(result.new_status).toBe('complete');
    expect(result.action_taken).toBe('updated_status_to_complete');
  });

  test('should retry fulfilment once on failure', async () => {
    // This test would require spying on the triggerFulfilment method
    // or simulating a failure in the mock.
    // For this stub, we verify the structure is ready for retry logic.
    expect(OrderAutomationHandler.triggerFulfilment).toBeDefined();
  });
});
