import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * Order List Tool Definition
 */
export const definition = {
  name: "list_recent_orders",
  description: "Fetches a list of recent orders from Magento with optional status filtering",
  inputSchema: {
    type: "object",
    properties: {
      status: { 
        type: "string", 
        description: "Order status to filter by (e.g. 'pending', 'processing', 'complete')",
        default: "pending" 
      },
      limit: { 
        type: "number", 
        description: "Number of orders to return",
        default: 5 
      }
    }
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  return await OrderAutomationHandler.listRecent(args);
};
