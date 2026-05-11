import { StoreHandler } from '../handlers/store_handler.js';
import { createRateLimiter } from '../lib/rate_limiter.js';

const storeLimiter = createRateLimiter('store_info', { max_per_minute: 30 });

/**
 * Store Info Tools
 */
export const definition = [
  {
    name: "list_store_views",
    description: "List all available websites, store groups, and store views (languages) in the Magento system.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_store_configs",
    description: "Get general configuration for all store views (locale, currency, base URL, etc.).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_localized_product",
    description: "Get product details (name, description, etc.) translated/localized for a specific store view.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", description: "Product SKU" },
        store_code: { type: "string", description: "Store view code (e.g., 'default', 'en_us')" }
      },
      required: ["sku", "store_code"]
    }
  }
];

/**
 * Multiple tools handler
 */
export const handler = async (args, toolName) => {
  const status = storeLimiter.check('global');
  if (!status.allowed) {
    throw new Error(`Rate limit exceeded for store info. Please retry in ${Math.ceil(status.retry_after_ms / 1000)}s.`);
  }

  switch (toolName) {
    case "list_store_views":
      return await StoreHandler.listStores();
    case "get_store_configs":
      return await StoreHandler.getStoreConfigs();
    case "get_localized_product":
      return await StoreHandler.getLocalizedProduct(args);
    default:
      throw new Error(`Tool ${toolName} not found in store_info module.`);
  }
};
