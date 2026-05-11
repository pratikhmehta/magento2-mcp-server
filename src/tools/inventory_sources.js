import { InventoryHandler } from '../handlers/inventory_handler.js';
import { createRateLimiter } from '../lib/rate_limiter.js';

const inventoryLimiter = createRateLimiter('inventory_sources', { max_per_minute: 60 });

/**
 * Product Inventory Sources Tool Definition
 */
export const definition = [
  {
    name: "get_product_stock_per_source",
    description: "Get the stock quantity of a specific product (SKU) across all inventory sources/stores (Multi-Source Inventory).",
    inputSchema: {
      type: "object",
      properties: {
        sku: { 
          type: "string", 
          description: "The unique product SKU (e.g., '481022MASHINIIHEREGSEL9012')." 
        }
      },
      required: ["sku"]
    }
  },
  {
    name: "list_inventory_sources",
    description: "List all inventory sources (warehouses/physical stores) configured in Magento.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

/**
 * Tool Handler bridge
 */
export const handler = async (args, toolName) => {
  const status = inventoryLimiter.check('global');
  
  if (!status.allowed) {
    throw new Error(`Rate limit exceeded for inventory source checks. Please retry in ${Math.ceil(status.retry_after_ms / 1000)}s.`);
  }

  if (toolName === "get_product_stock_per_source") {
    return await InventoryHandler.getStockPerSource(args);
  } else if (toolName === "list_inventory_sources") {
    return await InventoryHandler.listSources();
  } else {
    throw new Error(`Tool ${toolName} not found.`);
  }
};
