import { AICustomerHandler } from '../handlers/ai_customer_handler.js';
import { createRateLimiter } from '../lib/rate_limiter.js';

const chatLimiter = createRateLimiter('chat', { max_per_minute: 20 });


/**
 * AI Customer Service Chat Tool
 */
export const definition = {
  name: "customer_chat",
  description: "Chat with a virtual Magento store assistant who has context of your orders",
  inputSchema: {
    type: "object",
    properties: {
      session_id: { 
        type: "string", 
        description: "Unique ID to maintain conversation history" 
      },
      message: { 
        type: "string", 
        description: "The customer message" 
      },
      customer_email: { 
        type: "string", 
        description: "Optional customer email to retrieve order history for context" 
      }
    },
    required: ["session_id", "message"]
  }
};

/**
 * Tool Handler bridge
 */
export const handler = async (args) => {
  const { session_id } = args;
  const status = chatLimiter.check(session_id);
  
  if (!status.allowed) {
    throw new Error(`Rate limit exceeded. Please retry in ${Math.ceil(status.retry_after_ms / 1000)}s.`);
  }

  return await AICustomerHandler.handleChat(args);
};
