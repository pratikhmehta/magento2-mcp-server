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

  // Background garbage collection to prevent memory leaks from abandoned keys
  const interval = setInterval(() => {
    const oneMinuteAgo = Date.now() - 60000;
    for (const [key, timestamps] of requests.entries()) {
      const valid = timestamps.filter((ts) => ts > oneMinuteAgo);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, 60000);
  if (interval.unref) interval.unref();

  return {
    check(key) {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      let timestamps = requests.get(key) || [];

      // Clean up old timestamps
      timestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

      if (timestamps.length >= max_per_minute) {
        const oldest = timestamps[0];
        const retryAfter = 60000 - (now - oldest);
        return { allowed: false, retry_after_ms: retryAfter };
      }

      timestamps.push(now);
      requests.set(key, timestamps);
      return { allowed: true, retry_after_ms: null };
    },
  };
}

/**
 * Deduplication Map with TTL
 */
const alertCache = new Map();

// Background garbage collection for expired alerts
const alertInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of alertCache.entries()) {
    if (now > expiresAt) {
      alertCache.delete(key);
    }
  }
}, 60000);
if (alertInterval.unref) alertInterval.unref();

/**
 * Deduplicates alerts based on a time window
 * @param {string} key - Unique key to deduplicate (e.g. SKU)
 * @param {number} window_ms - TTL in milliseconds
 * @returns {boolean} - true if new alert, false if duplicate
 */
export function deduplicateAlert(key, window_ms) {
  const now = Date.now();
  const expiresAt = alertCache.get(key);

  if (expiresAt && now < expiresAt) {
    return false;
  }

  alertCache.set(key, now + window_ms);
  return true;
}
