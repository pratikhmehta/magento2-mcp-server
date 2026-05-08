import { InventoryAlertHandler } from '../handlers/inventory_alerts_handler.js';
import { createRateLimiter } from '../lib/rate_limiter.js';

const inventoryLimiter = createRateLimiter('inventory', { max_per_minute: 60 });


/**
 * Inventory Alerts Tool Definition
 */
export const definition = {
  name: "check_inventory_alerts",
  description: "Check for products that are running low on stock so you can reorder them.",
  inputSchema: {
    type: "object",
    properties: {
      threshold: { 
        type: "number", 
        description: "Alert me if the quantity is below this number (defaults to 10).",
        default: 10
      },
      sku_filter: { 
        type: "string", 
        description: "Optional: Only check products with certain IDs (e.g., 'SHIRT-*')." 
      }
    }
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  const status = inventoryLimiter.check('global');
  
  if (!status.allowed) {
    throw new Error(`Global rate limit for inventory checks exceeded. Please retry in ${Math.ceil(status.retry_after_ms / 1000)}s.`);
  }

  return await InventoryAlertHandler.checkAlerts(args);
};
