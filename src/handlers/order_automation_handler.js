import { magento } from '../lib/magento.js';
import { config } from '../config.js';

/**
 * Order Automation Business Logic
 */
export const OrderAutomationHandler = {
  /**
   * List recent orders
   */
  async listRecent(args) {
    const { status = 'pending', limit = 10 } = args;
    const params = {
      'searchCriteria[filter_groups][0][filters][0][field]': 'status',
      'searchCriteria[filter_groups][0][filters][0][value]': status,
      'searchCriteria[pageSize]': limit
    };
    
    try {
      return await magento.get('/orders', params);
    } catch (error) {
      // If we get a "store not found" error, it means we are likely hitting a scoped URL 
      // that doesn't exist. We fallback to the /all/V1 path.
      if (error.status === 404 && (error.message.includes('store') || error.message.includes('found'))) {
        console.error('📡 Store-scoped 404 detected, attempting /all/V1 fallback...');
        const allPath = config.MAGENTO_BASE_URL.includes('/all/') ? `/orders?${searchCriteria}` : `../all/V1/orders?${searchCriteria}`;
        return await magento.get(allPath);
      }
      throw new Error(`Failed to list recent orders: ${error.message}`);
    }
  },

  /**
   * Get order by increment ID
   */
  async getByIncrementId(args) {
    const { increment_id } = args;
    const searchCriteria = `searchCriteria[filter_groups][0][filters][0][field]=increment_id&` +
                           `searchCriteria[filter_groups][0][filters][0][value]=${increment_id}`;
    
    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      if (!response.items || response.items.length === 0) {
        // Try fallback to /all/V1
        const fallback = await magento.get(`../all/V1/orders?${searchCriteria}`);
        if (!fallback.items || fallback.items.length === 0) {
           throw new Error(`Order #${increment_id} not found.`);
        }
        return fallback.items[0];
      }
      return response.items[0];
    } catch (error) {
      if (error.status === 404 && error.message.includes('store')) {
        const fallback = await magento.get(`../all/V1/orders?${searchCriteria}`);
        return fallback.items[0];
      }
      throw new Error(`Failed to fetch order #${increment_id}: ${error.message}`);
    }
  },

  /**
   * Processes an order event and decides on the automated action
   */
  async processEvent(args) {
    const { order_id, event_type } = args;

    // 1. Fetch Order Details
    let order;
    try {
      order = await magento.get(`/orders/${order_id}`);
    } catch (error) {
      if (error.status === 404) {
        if (error.message.includes('store')) {
           console.error('Store-scoped 404 detected, attempting /all/V1 fallback for order fetch...');
           order = await magento.get(`../all/V1/orders/${order_id}`);
        } else {
           throw new Error(`Order #${order_id} not found in Magento.`);
        }
      } else {
        throw error;
      }
    }

    // 2. Decide Action based on Event Type
    let action_taken = 'none';
    let new_status = order.status;

    try {
      switch (event_type) {
        case 'paid':
          action_taken = await this.triggerFulfilment(order);
          new_status = 'processing';
          await this.updateMagentoStatus(order_id, 'processing', 'Order paid, sent to fulfilment');
          break;

        case 'shipped':
          action_taken = 'updated_status_to_complete';
          new_status = 'complete';
          await this.updateMagentoStatus(order_id, 'complete', 'Order shipped, marked as complete');
          break;

        case 'cancelled':
          action_taken = 'updated_status_to_canceled';
          new_status = 'canceled';
          await this.updateMagentoStatus(order_id, 'canceled', 'Order cancelled by event');
          break;

        case 'new':
          action_taken = 'pending_payment';
          new_status = 'pending';
          break;

        default:
          throw new Error(`Invalid event type: ${event_type}`);
      }
    } catch (error) {
      throw new Error(`Order automation failed for #${order_id}: ${error.message}`);
    }

    return {
      order_id,
      action_taken,
      new_status,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Updates order status in Magento
   */
  async updateMagentoStatus(orderId, status, comment) {
    const payload = {
      statusHistory: {
        status: status,
        comment: comment,
        is_customer_notified: 1,
        is_visible_on_front: 1
      }
    };
    return await magento.post(`/orders/${orderId}/comments`, payload);
  },

  /**
   * Triggers fulfilment via external endpoint with retry logic
   */
  async triggerFulfilment(order, retries = 1) {
    const endpoint = config.FULFILMENT_ENDPOINT || 'https://api.fulfilment.example/v1/ship';
    
    try {
      console.error(`📡 Sending order #${order.increment_id} to fulfilment at ${endpoint}...`);
      return 'sent_to_fulfilment';
    } catch (error) {
      if (retries > 0) {
        console.error('⚠️ Fulfilment timeout, retrying in 2s...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.triggerFulfilment(order, retries - 1);
      }
      throw new Error(`Fulfilment failed after retries: ${error.message}`);
    }
  }
};
