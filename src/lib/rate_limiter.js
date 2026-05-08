/**
 * Rate Limiter and Deduplication Library
 * Simple in-memory protection for API and alert endpoints
 */

/**
 * Creates a sliding-window rate limiter
 * @param {string} name - Limiter identifier for logs
 * @param {object} options 
 * @param {number} options.max_per_minute - Limit per 60s
 */
export function createRateLimiter(name, { max_per_minute }) {
  const requests = new Map(); // key -> timestamps[]

  return {
    check(key) {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      let timestamps = requests.get(key) || [];
      
      // Clean up old timestamps
      timestamps = timestamps.filter(ts => ts > oneMinuteAgo);
      
      if (timestamps.length >= max_per_minute) {
        const oldest = timestamps[0];
        const retryAfter = 60000 - (now - oldest);
        return { allowed: false, retry_after_ms: retryAfter };
      }

      timestamps.push(now);
      requests.set(key, timestamps);
      return { allowed: true, retry_after_ms: null };
    }
  };
}

/**
 * Deduplication Set with TTL
 */
const alertCache = new Set();

/**
 * Deduplicates alerts based on a time window
 * @param {string} key - Unique key to deduplicate (e.g. SKU)
 * @param {number} window_ms - TTL in milliseconds
 * @returns {boolean} - true if new alert, false if duplicate
 */
export function deduplicateAlert(key, window_ms) {
  if (alertCache.has(key)) {
    return false;
  }

  alertCache.add(key);
  setTimeout(() => {
    alertCache.delete(key);
  }, window_ms);

  return true;
}
