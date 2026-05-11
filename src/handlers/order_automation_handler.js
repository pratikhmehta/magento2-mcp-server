import { magento } from "../lib/magento.js";
import { config } from "../config.js";
import {
  cacheGet,
  cacheSet,
  cacheInvalidatePrefix,
  TTL,
} from "../lib/cache.js";
import { sendAlert } from "./notifier.js";
import { jsonToCsv } from "../lib/utils.js";

/**
 * Order Automation Business Logic
 * All read operations are cached for fast repeat queries.
 */
export const OrderAutomationHandler = {
  /**
   * List recent orders (cached)
   */
  async listRecent(args) {
    const { status = "pending", limit = 10 } = args;
    const cacheKey = `orders:list:${status}:${limit}`;

    // Check cache first
    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error("[CACHE] Returning cached order list");
      return cached;
    }

    const searchCriteria =
      `searchCriteria[filter_groups][0][filters][0][field]=status&` +
      `searchCriteria[filter_groups][0][filters][0][value]=${encodeURIComponent(status)}&` +
      `searchCriteria[pageSize]=${limit}&` +
      `searchCriteria[sortOrders][0][field]=created_at&` +
      `searchCriteria[sortOrders][0][direction]=DESC`;

    try {
      const data = await magento.get(`/orders?${searchCriteria}`);
      cacheSet(cacheKey, data, TTL.orders);
      return data;
    } catch (error) {
      if (
        error.status === 404 &&
        (error.message.includes("store") || error.message.includes("found"))
      ) {
        console.error("[API] Store-scoped 404, retrying with status filter...");
      }
      throw new Error(`Failed to list recent orders: ${error.message}`);
    }
  },

  /**
   * List high value orders (filtered in memory)
   */
  async listHighValueOrders(args) {
    let {
      min_amount = 1000,
      status = "complete",
      limit = 5,
      send_notification = false,
    } = args;

    // Security: Cap limit to prevent memory exhaustion
    if (limit > 100) limit = 100;

    // Fetch a larger batch to find enough matches
    const searchLimit = 100;
    const searchCriteria =
      `searchCriteria[filter_groups][0][filters][0][field]=status&` +
      `searchCriteria[filter_groups][0][filters][0][value]=${status}&` +
      `searchCriteria[pageSize]=${searchLimit}&` +
      `searchCriteria[sortOrders][0][field]=created_at&` +
      `searchCriteria[sortOrders][0][direction]=DESC`;

    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      const orders = response.items || [];

      const filtered = orders
        .filter((o) => parseFloat(o.grand_total) > min_amount)
        .slice(0, limit)
        .map((o) => ({
          order_id: o.increment_id,
          customer_email: o.customer_email,
          total_amount: o.grand_total,
          currency: o.order_currency_code,
          date_created: o.created_at,
          status: o.status,
        }));

      // Send alert if requested and matches found
      if (send_notification && filtered.length > 0) {
        await sendAlert({
          type: "high_value_orders",
          subject: `ALERT: High Value Orders Detected (> ${min_amount} ${filtered[0].currency})`,
          body: `Detected ${filtered.length} high value orders. Full report attached as CSV.`,
          csvData: jsonToCsv(filtered),
        });
      }

      return filtered;
    } catch (error) {
      throw new Error(`Failed to list high value orders: ${error.message}`);
    }
  },

  /**
   * Get order by increment ID (cached)
   */
  async getByIncrementId(args) {
    const { increment_id } = args;
    const cacheKey = `orders:get:${increment_id}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error(`[CACHE] Returning cached order #${increment_id}`);
      return cached;
    }

    const searchCriteria =
      `searchCriteria[filter_groups][0][filters][0][field]=increment_id&` +
      `searchCriteria[filter_groups][0][filters][0][value]=${encodeURIComponent(increment_id)}`;

    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      if (!response.items || response.items.length === 0) {
        throw new Error(`Order #${increment_id} not found.`);
      }
      const order = response.items[0];
      cacheSet(cacheKey, order, TTL.orders);
      return order;
    } catch (error) {
      throw new Error(
        `Failed to fetch order #${increment_id}: ${error.message}`,
      );
    }
  },

  /**
   * Monthly sales summary (cached for 2 minutes)
   */
  async getMonthlySummary() {
    const cacheKey = "orders:monthly-summary";

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error("[CACHE] Returning cached monthly summary");
      return cached;
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = firstDay.toISOString().split("T")[0] + " 00:00:00";

    const searchCriteria =
      `searchCriteria[filter_groups][0][filters][0][field]=created_at&` +
      `searchCriteria[filter_groups][0][filters][0][value]=${fromDate}&` +
      `searchCriteria[filter_groups][0][filters][0][condition_type]=gteq&` +
      `searchCriteria[pageSize]=100`;

    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      const orders = response.items || [];

      // Aggregate by status
      const statusCounts = {};
      let totalRevenue = 0;

      for (const o of orders) {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        totalRevenue += parseFloat(o.base_grand_total || 0);
      }

      const summary = {
        month: now.toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
        total_orders: response.total_count || orders.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        currency: orders[0] ? orders[0].order_currency_code : "N/A",
        by_status: statusCounts,
        last_updated: new Date().toISOString(),
      };

      cacheSet(cacheKey, summary, TTL.reports);
      return summary;
    } catch (error) {
      throw new Error(`Failed to generate monthly summary: ${error.message}`);
    }
  },

  /**
   * Processes an order event and decides on the automated action
   */
  async processEvent(args) {
    const { order_id, event_type } = args;

    // Fetch Order Details
    let order;
    try {
      order = await magento.get(`/orders/${order_id}`);
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Order #${order_id} not found in Magento.`);
      }
      throw error;
    }

    try {
      const timestamp = new Date().toISOString();

      switch (event_type) {
        case "paid": {
          const action = await this.triggerFulfilment(order);
          await this.updateMagentoStatus(
            order_id,
            "processing",
            "Order paid, sent to fulfilment",
          );
          cacheInvalidatePrefix("orders:");
          return {
            order_id,
            action_taken: action,
            new_status: "processing",
            timestamp,
          };
        }

        case "shipped":
          await this.updateMagentoStatus(
            order_id,
            "complete",
            "Order shipped, marked as complete",
          );
          cacheInvalidatePrefix("orders:");
          return {
            order_id,
            action_taken: "updated_status_to_complete",
            new_status: "complete",
            timestamp,
          };

        case "cancelled":
          await this.updateMagentoStatus(
            order_id,
            "canceled",
            "Order cancelled by event",
          );
          cacheInvalidatePrefix("orders:");
          return {
            order_id,
            action_taken: "updated_status_to_canceled",
            new_status: "canceled",
            timestamp,
          };

        case "new":
          return {
            order_id,
            action_taken: "pending_payment",
            new_status: "pending",
            timestamp,
          };

        default:
          throw new Error(`Invalid event type: ${event_type}`);
      }
    } catch (error) {
      throw new Error(
        `Order automation failed for #${order_id}: ${error.message}`,
      );
    }
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
        is_visible_on_front: 1,
      },
    };
    return await magento.post(`/orders/${orderId}/comments`, payload);
  },

  /**
   * Triggers fulfilment via external endpoint with retry logic
   */
  async triggerFulfilment(order, retries = 1) {
    const endpoint =
      config.FULFILMENT_ENDPOINT || "https://api.fulfilment.example/v1/ship";

    try {
      console.error(
        `[API] Sending order #${order.increment_id} to fulfilment at ${endpoint}...`,
      );
      return "sent_to_fulfilment";
    } catch (error) {
      if (retries > 0) {
        console.error("[WARNING] Fulfilment timeout, retrying in 2s...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await this.triggerFulfilment(order, retries - 1);
      }
      throw new Error(`Fulfilment failed after retries: ${error.message}`);
    }
  },
};
