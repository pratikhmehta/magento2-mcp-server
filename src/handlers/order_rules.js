/**
 * Order Rules Engine
 * Decides automated actions based on order data and event types
 */

/**
 * Returns a human-readable list of active automation rules
 * @returns {string[]}
 */
export function describeRules() {
  return [
    "Paid orders via PayPal are automatically sent to fulfilment.",
    "Paid orders under $50 are automatically sent to fulfilment.",
    "Cancelled orders automatically trigger item restocking.",
    "New orders from wholesale customers are flagged for manual review."
  ];
}

/**
 * Evaluates an order against built-in automation rules
 * @param {object} order - Magento order object
 * @param {string} event_type - Type of event (new, paid, cancelled, etc.)
 * @returns {object|null} - Action object or null if no rule matches
 */
export function applyRules(order, event_type) {
  const { 
    grand_total, 
    payment, 
    customer_group_id, 
    increment_id 
  } = order;

  // Note: In a production system, these values would come from Admin Config
  const paymentMethod = payment?.method;
  const isWholesale = customer_group_id === 2; // Assuming 2 is Wholesale group ID

  // Rule 1: event=paid AND payment_method=paypal AND total > 0
  if (event_type === 'paid' && paymentMethod === 'paypal' && grand_total > 0) {
    return { 
      action: 'auto_fulfill', 
      payload: { reason: 'PayPal auto-approval', order_increment_id: increment_id } 
    };
  }

  // Rule 2: event=paid AND total < 50
  if (event_type === 'paid' && grand_total < 50) {
    return { 
      action: 'auto_fulfill', 
      payload: { reason: 'Low value auto-approval', order_increment_id: increment_id } 
    };
  }

  // Rule 3: event=cancelled
  if (event_type === 'cancelled') {
    return { 
      action: 'restock_items', 
      payload: { order_increment_id: increment_id } 
    };
  }

  // Rule 4: event=new AND customer_group=wholesale
  if (event_type === 'new' && isWholesale) {
    return { 
      action: 'flag_for_review', 
      payload: { reason: 'Wholesale manual check required', order_increment_id: increment_id } 
    };
  }

  // Default: No rule matched
  return null;
}
