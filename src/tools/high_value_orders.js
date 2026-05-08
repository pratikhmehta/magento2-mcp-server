import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * High Value Orders Tool Definition
 */
export const definition = {
  name: "get_high_value_orders",
  description: "Find recent orders above a specific price threshold for a given status.",
  inputSchema: {
    type: "object",
    properties: {
      min_amount: { 
        type: "number", 
        description: "Minimum order total amount (e.g., 42220)." 
      },
      status: { 
        type: "string", 
        description: "Filter by status ('complete', 'pending', etc.).",
        default: "complete"
      },
      limit: { 
        type: "number", 
        description: "Maximum number of results to return.",
        default: 5 
      },
      send_notification: {
        type: "boolean",
        description: "If true, sends an email alert when matches are found.",
        default: false
      }
    },
    required: ["min_amount"]
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  return await OrderAutomationHandler.listHighValueOrders(args);
};
