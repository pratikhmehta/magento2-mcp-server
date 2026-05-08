import { magento } from '../lib/magento.js';
import { cacheGet, cacheSet, TTL } from '../lib/cache.js';
import { sendAlert } from './notifier.js';
import { jsonToCsv } from '../lib/utils.js';

/**
 * Customer Management Handler
 * All read operations are cached for fast repeat queries.
 */
export const CustomerHandler = {
  /**
   * List recent customers (cached)
   */
  async list(args) {
    const { limit = 10 } = args;
    const cacheKey = `customers:list:${limit}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error('[CACHE] Returning cached customer list');
      return cached;
    }

    const searchCriteria = `searchCriteria[pageSize]=${limit}&` +
                           `searchCriteria[sortOrders][0][field]=created_at&` +
                           `searchCriteria[sortOrders][0][direction]=DESC`;
    
    try {
      const data = await magento.get(`/customers/search?${searchCriteria}`);
      cacheSet(cacheKey, data, TTL.products);
      return data;
    } catch (error) {
      throw new Error(`Failed to list customers: ${error.message}`);
    }
  },

  /**
   * Find top spending customers (calculated in memory)
   * Note: This fetches a batch of recent orders and aggregates totals per customer.
   */
  async getTopCustomers(args) {
    let { limit = 5, send_notification = false } = args;
    
    // Security: Cap limit to prevent memory exhaustion
    if (limit > 100) limit = 100;

    // Fetch a large batch of orders to calculate totals
    const searchLimit = 100;
    const searchCriteria = `searchCriteria[pageSize]=${searchLimit}&` +
                           `searchCriteria[sortOrders][0][field]=created_at&` +
                           `searchCriteria[sortOrders][0][direction]=DESC`;

    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      const orders = response.items || [];
      
      const aggregation = {};
      for (const order of orders) {
        const email = order.customer_email;
        if (!aggregation[email]) {
          aggregation[email] = {
            email: email,
            name: `${order.customer_firstname} ${order.customer_lastname}`,
            total_spent: 0,
            order_count: 0,
            currency: order.order_currency_code
          };
        }
        aggregation[email].total_spent += parseFloat(order.grand_total);
        aggregation[email].order_count += 1;
      }

      const sorted = Object.values(aggregation)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, limit);

      // Send alert if requested and matches found
      if (send_notification && sorted.length > 0) {
        await sendAlert({
          type: 'top_customers',
          subject: `ALERT: Top Spending Customers Report`,
          body: `Generated a report of the top ${sorted.length} spending customers. Full details attached.`,
          csvData: jsonToCsv(sorted)
        });
      }

      return sorted;
    } catch (error) {
      throw new Error(`Failed to calculate top customers: ${error.message}`);
    }
  }
};
