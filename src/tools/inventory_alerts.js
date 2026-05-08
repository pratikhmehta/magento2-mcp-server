import { InventoryAlertHandler } from '../handlers/inventory_alerts_handler.js';
import { createRateLimiter } from '../lib/rate_limiter.js';

const inventoryLimiter = createRateLimiter('inventory', { max_per_minute: 60 });


/**
 * Inventory Alerts Tool Definition
 */
export const definition = {
  name: "check_inventory_alerts",
  description: "Monitor and filter low-stock items across Magento inventory sources",
  inputSchema: {
    type: "object",
    properties: {
      threshold: { 
        type: "number", 
        description: "Quantity threshold for low stock alert (default: 10)",
        default: 10
      },
      sku_filter: { 
        type: "string", 
        description: "Optional glob pattern to filter by SKU (e.g. 'SHIRT-*')" 
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
