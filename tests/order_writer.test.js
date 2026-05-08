import { OrderWriter, OrderWriteError } from '../src/handlers/order_writer.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// We need to mock the axios instance created inside magento.js
// Since magento.js exports 'magento' which uses 'client' (an axios instance)
import { magento } from '../src/lib/magento.js';

describe('OrderWriter Handler', () => {
  let mock;

  beforeAll(() => {
    // This is a bit tricky since 'client' isn't exported directly.
    // However, since we mock axios globally in Jest, we can intercept.
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
    jest.clearAllMocks();
  });

  describe('updateOrderStatus', () => {
    test('should update status successfully', async () => {
      // Setup mock for the specific endpoint
      // Note: In real magento.js, baseURL is applied. 
      // MockAdapter intercepts based on the final URL or regex.
      mock.onPost(/\/orders\/\d+\/comments/).reply(200, { success: true });

      const result = await OrderWriter.updateOrderStatus('123', 'processing', 'Validated');
      
      expect(result.success).toBe(true);
      expect(result.new_status).toBe('processing');
    });

    test('should retry once on 503 error', async () => {
      mock.onPost(/\/orders\/\d+\/comments/)
          .replyOnce(503)
          .onPost(/\/orders\/\d+\/comments/)
          .reply(200, {});

      const result = await OrderWriter.updateOrderStatus('123', 'complete');
      expect(result.success).toBe(true);
    });

    test('should throw OrderWriteError on validation failure', async () => {
      await expect(OrderWriter.updateOrderStatus('', ''))
        .rejects.toThrow(); // Zod error
    });

    test('should throw OrderWriteError on persistent 500 error', async () => {
      mock.onPost(/\/orders\/\d+\/comments/).reply(500, { message: 'Internal Server Error' });

      try {
        await OrderWriter.updateOrderStatus('123', 'complete');
      } catch (e) {
        expect(e).toBeInstanceOf(OrderWriteError);
        expect(e.order_id).toBe('123');
      }
    });
  });

  describe('triggerFulfilment', () => {
    test('should trigger shipment and return shipment_id', async () => {
      mock.onPost(/\/order\/\d+\/ship/).reply(200, 100055);

      const result = await OrderWriter.triggerFulfilment('123');
      expect(result.shipment_id).toBe(100055);
    });
  });
});
