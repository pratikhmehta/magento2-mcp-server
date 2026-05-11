import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * Order List Tool Definition
 */
export const definition = {
  name: "list_recent_orders",
  description: "Get a summary of the latest orders to see what needs attention (e.g., pending or complete).",
  inputSchema: {
    type: "object",
    properties: {
      status: { 
        type: "string", 
        description: "The order status to look for (like 'pending' or 'complete').",
        default: "pending" 
      },
      limit: { 
        type: "number", 
        description: "How many orders to show at once.",
        default: 5 
      },
      store_code: { 
        type: "string", 
        description: "Optional store view code for localized data." 
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
