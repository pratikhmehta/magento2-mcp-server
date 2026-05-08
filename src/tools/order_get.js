import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * Order Get Tool Definition
 */
export const definition = {
  name: "get_order",
  description: "Look up the full details and history for a specific order using its order number.",
  inputSchema: {
    type: "object",
    properties: {
      increment_id: { 
        type: "string", 
        description: "The order number (e.g., '211000000293')." 
      }
    },
    required: ["increment_id"]
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  return await OrderAutomationHandler.getByIncrementId(args);
};
