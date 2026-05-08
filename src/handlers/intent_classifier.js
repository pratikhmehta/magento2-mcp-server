/**
 * Intent Classifier
 * Lightweight keyword-based classification for fast-path routing
 */

const KEYWORDS = {
  order_status: ['status', 'where is', 'track', 'tracking', 'order #', 'has it shipped'],
  return: ['return', 'refund', 'exchange', 'rma', 'send back'],
  product_question: ['specs', 'detail', 'material', 'size', 'color', 'compatible', 'features'],
  complaint: ['broken', 'damaged', 'worst', 'angry', 'terrible', 'never arrived', 'wrong item'],
};

/**
 * Classifies a user message into a predefined intent
 * @param {string} message 
 * @returns {object}
 */
export function classifyIntent(message) {
  const msg = message.toLowerCase();
  let detectedIntent = 'other';
  let hitCount = 0;

  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    const hits = keywords.filter(k => msg.includes(k));
    if (hits.length > hitCount) {
      detectedIntent = intent;
      hitCount = hits.length;
    }
  }

  // Determine confidence
  const confidence = hitCount > 1 ? 'high' : (hitCount === 1 ? 'low' : 'low');

  return {
    intent: detectedIntent,
    confidence: detectedIntent === 'other' ? 'low' : confidence
  };
}

/**
 * Decides if a query needs human escalation based on intent and sentiment
 * @param {string} intent 
 * @param {string} message 
 * @returns {boolean}
 */
export function needsEscalation(intent, message) {
  const msg = message.toLowerCase();
  const negativeKeywords = ['supervisor', 'human', 'lawyer', 'sue', 'police', 'fraud'];
  const hasNegativeSentiment = negativeKeywords.some(k => msg.includes(k));

  // Escalate if it's a complaint with negative keywords
  if (intent === 'complaint' && (hasNegativeSentiment || msg.length > 200)) {
    return true;
  }

  // Escalate if explicitly asking for a human
  if (msg.includes('human') || msg.includes('person') || msg.includes('talk to someone')) {
    return true;
  }

  return false;
}
