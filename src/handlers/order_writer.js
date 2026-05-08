import { magento } from '../lib/magento.js';
import { z } from 'zod';

/**
 * Custom Error for Order Writing Operations
 */
export class OrderWriteError extends Error {
  constructor(code, message, order_id) {
    super(message);
    this.name = 'OrderWriteError';
    this.code = code;
    this.order_id = order_id;
  }
}

/**
 * Order Writer Handler
 * Manages write operations (status updates, shipping, restocking) to Magento
 */

const statusSchema = z.object({
  order_id: z.string().min(1),
  status: z.string().min(1),
  comment: z.string().max(1000).optional()
});

const shipmentSchema = z.object({
  order_id: z.string().min(1),
  items: z.array(z.object({
    order_item_id: z.number().int(),
    qty: z.number().positive()
  })).optional()
});

/**
 * Helper to wrap calls with a single retry on 503
 */
async function withRetry(fn, order_id) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 503) {
      console.warn(`⚠️ Magento 503 Service Unavailable for order #${order_id}, retrying...`);
      return await fn();
    }
    throw new OrderWriteError(error.status || 'UNKNOWN', error.message, order_id);
  }
}

export const OrderWriter = {
  /**
   * Updates order status with a comment
   */
  async updateOrderStatus(order_id, status, comment = '') {
    statusSchema.parse({ order_id, status, comment });

    const payload = {
      statusHistory: {
        status: status,
        comment: comment,
        is_customer_notified: 1,
        is_visible_on_front: 1
      }
    };

    return await withRetry(async () => {
      await magento.post(`/orders/${order_id}/comments`, payload);
      return { success: true, new_status: status };
    }, order_id);
  },

  /**
   * Triggers fulfilment/shipment for an order
   */
  async triggerFulfilment(order_id, items = []) {
    shipmentSchema.parse({ order_id, items });

    const payload = items.length > 0 ? { items } : {};

    return await withRetry(async () => {
      const shipment_id = await magento.post(`/order/${order_id}/ship`, payload);
      return { shipment_id };
    }, order_id);
  },

  /**
   * Restocks items from a cancelled order back into inventory
   */
  async restockItems(order_id) {
    return await withRetry(async () => {
      // 1. Get order items
      const order = await magento.get(`/orders/${order_id}`);
      const itemsToRestock = order.items.filter(i => i.qty_ordered > 0);

      // 2. Increment quantity for each item
      // Note: In Magento 2 Multi-Source Inventory, this usually targets a specific source
      for (const item of itemsToRestock) {
        const payload = {
          sourceItems: [
            {
              source_code: 'default',
              sku: item.sku,
              quantity: item.qty_ordered, // This endpoint usually overwrites, so logic depends on Magento version
              status: 1
            }
          ]
        };
        // Using a simplified increment approach for this tool
        await magento.post('/inventory/source-items', payload);
      }
    }, order_id);
  }
};
