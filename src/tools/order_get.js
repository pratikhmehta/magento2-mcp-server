import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * Order Get Tool Definition
 */
export const definition = {
  name: "get_order",
  description: "Fetches detailed data for a specific Magento order by its Increment ID",
  inputSchema: {
    type: "object",
    properties: {
      increment_id: { 
        type: "string", 
        description: "The Magento Order Increment ID (e.g. '211000000293')" 
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
