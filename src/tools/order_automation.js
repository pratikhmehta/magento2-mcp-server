import { OrderAutomationHandler } from '../handlers/order_automation_handler.js';

/**
 * Order Automation Tool Definition
 */
export const definition = {
  name: "process_order_event",
  description: "Handle order lifecycle events (paid, shipped, etc.) and automate transitions",
  inputSchema: {
    type: "object",
    properties: {
      order_id: { 
        type: "string", 
        description: "Magento Order ID (internal ID)" 
      },
      event_type: { 
        type: "string", 
        enum: ["new", "paid", "shipped", "cancelled"],
        description: "The type of event that occurred"
      },
      metadata: {
        type: "object",
        description: "Optional metadata related to the event"
      }
    },
    required: ["order_id", "event_type"]
  }
};

/**
 * Tool Handler bridge
 */
export const handler = OrderAutomationHandler.processEvent.bind(OrderAutomationHandler);
