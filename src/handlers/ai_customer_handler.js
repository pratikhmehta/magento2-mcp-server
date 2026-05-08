import { GoogleGenerativeAI } from '@google/generative-ai';
import { magento } from '../lib/magento.js';
import { config } from '../config.js';

/**
 * AI Customer Service Logic - Gemini Powered
 */

// In-memory conversation store (session_id -> array of messages)
const sessionHistory = new Map();
const MAX_HISTORY = 10;

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export const AICustomerHandler = {
  /**
   * Processes a customer chat message and returns an AI response
   */
  async handleChat(args) {
    const { session_id, message, customer_email } = args;

    // 1. Get or initialize history
    let history = sessionHistory.get(session_id) || [];

    // 2. Fetch context if email is provided
    let orderContext = "No customer email provided, so no order history is available.";
    if (customer_email) {
      const searchCriteria = `searchCriteria[filter_groups][0][filters][0][field]=customer_email&` +
                             `searchCriteria[filter_groups][0][filters][0][value]=${customer_email}&` +
                             `searchCriteria[pageSize]=5&` +
                             `searchCriteria[sortOrders][0][field]=created_at&` +
                             `searchCriteria[sortOrders][0][direction]=DESC`;
      
      try {
        const response = await magento.get(`/orders?${searchCriteria}`);
        const orders = response.items || [];
        if (orders.length > 0) {
          orderContext = orders.map(o => 
            `- Order #${o.increment_id}: Status ${o.status}, Total ${o.grand_total} ${o.order_currency_code}, Date ${o.created_at}`
          ).join('\n');
        } else {
          orderContext = "No orders found for this customer.";
        }
      } catch (error) {
        console.error('Failed to fetch order history for AI context:', error.message);
        orderContext = "Error retrieving order history.";
      }
    }

    // 3. Build system prompt
    const systemPrompt = `You are a Magento Store Assistant.
Your goal is to help customers with their inquiries using the provided order history.
Always respond in the customer's detected language.

Customer Context (${customer_email || 'Guest'}):
${orderContext}

If the customer is frustrated, asks for a human, or their issue cannot be resolved through information alone, include the instruction "ESCALATE: TRUE" at the end of your response.`;

    // 4. Call Gemini
    try {
      // Correct format for Gemini system instruction
      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      });

      const result = await chat.sendMessage(message);
      const replyText = result.response.text();
      
      const escalate = replyText.includes('ESCALATE: TRUE');
      const cleanReply = replyText.replace('ESCALATE: TRUE', '').trim();

      // 5. Update history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: cleanReply });
      
      // Keep only last N turns
      if (history.length > MAX_HISTORY * 2) {
        history = history.slice(-MAX_HISTORY * 2);
      }
      sessionHistory.set(session_id, history);

      return {
        reply: cleanReply,
        session_id,
        escalate
      };
    } catch (error) {
      console.error('Gemini API error:', error.message);
      throw new Error(`AI Chat processing failed: ${error.message}`);
    }
  }
};
