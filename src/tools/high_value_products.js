import { ProductHandler } from '../handlers/product_handler.js';

/**
 * High Value Products Tool Definition
 */
export const definition = {
  name: "get_high_value_products",
  description: "Find products priced above a specific threshold.",
  inputSchema: {
    type: "object",
    properties: {
      min_price: { 
        type: "number", 
        description: "Minimum product price (e.g., 50000)." 
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
    required: ["min_price"]
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  return await ProductHandler.getHighValueProducts(args);
};
