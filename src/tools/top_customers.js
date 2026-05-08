import { CustomerHandler } from '../handlers/customer_handler.js';

/**
 * Top Customers Tool Definition
 */
export const definition = {
  name: "get_top_customers",
  description: "Find the top spending customers based on recent orders.",
  inputSchema: {
    type: "object",
    properties: {
      limit: { 
        type: "number", 
        description: "Maximum number of customers to return.",
        default: 5 
      },
      send_notification: {
        type: "boolean",
        description: "If true, sends an email alert when the report is ready.",
        default: false
      }
    }
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  return await CustomerHandler.getTopCustomers(args);
};
