/**
 * In-Memory Cache with TTL
 * Reduces API calls and provides faster responses for repeated queries.
 * Each cache entry has a configurable time-to-live (TTL) in seconds.
 */

const store = new Map();

/**
 * Default TTL values (in seconds) per data type
 */
const TTL = {
  orders: 60, // 1 minute  - orders change frequently
  products: 300, // 5 minutes - product data is relatively stable
  inventory: 120, // 2 minutes - stock levels need moderate freshness
  reports: 600, // 10 minutes - reports are expensive to generate
};

/**
 * Get a cached value by key
 * @param {string} key
 * @returns {any|null} cached data or null if expired/missing
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set a cache value with TTL
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds - override default TTL
 */
export function cacheSet(key, data, ttlSeconds) {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
    cachedAt: new Date().toISOString(),
  });
}

/**
 * Invalidate a specific cache key
 * @param {string} key
 */
export function cacheInvalidate(key) {
  store.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix
 * @param {string} prefix
 */
export function cacheInvalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Clear all cached data
 */
export function cacheClear() {
  store.clear();
}

/**
 * Get cache stats for debugging
 */
export function cacheStats() {
  let active = 0;
  let expired = 0;
  const now = Date.now();

  for (const entry of store.values()) {
    if (now > entry.expiresAt) expired++;
    else active++;
  }

  return { active, expired, total: store.size };
}

// Background garbage collection for expired cache entries
const gcInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}, 60000); // Sweep every 60 seconds

if (gcInterval.unref) gcInterval.unref(); // Prevent interval from blocking process exit

export { TTL };
