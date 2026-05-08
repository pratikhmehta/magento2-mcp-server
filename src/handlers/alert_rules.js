/**
 * In-memory store for alert history
 * Keys are SKUs, values are timestamps (Date objects)
 */
const alertHistory = new Map();

/**
 * Records that an alert was sent for a specific SKU
 * @param {string} sku 
 */
export function recordAlertSent(sku) {
  alertHistory.set(sku, new Date());
}

/**
 * Checks if a SKU is currently in its cooldown period
 * @param {string} sku 
 * @param {number} cooldown_minutes 
 * @returns {boolean}
 */
export function isCoolingDown(sku, cooldown_minutes) {
  const lastSent = alertHistory.get(sku);
  if (!lastSent) return false;

  const now = new Date();
  const diffInMinutes = (now - lastSent) / 1000 / 60;
  
  return diffInMinutes < cooldown_minutes;
}

/**
 * Evaluates whether a stock item should trigger an alert based on rules
 * @param {object} item - The Magento source-item object
 * @param {object} rules - Alert rules configuration
 * @param {number} rules.min_qty - Quantity threshold
 * @param {number} rules.cooldown_minutes - Minutes to wait between alerts
 * @param {string[]} rules.skus_exclude - List of SKUs to ignore
 * @returns {boolean}
 */
export function shouldAlert(item, rules) {
  const { sku, quantity } = item;
  const { min_qty, cooldown_minutes, skus_exclude = [] } = rules;

  // 1. Check if SKU is excluded
  if (skus_exclude.includes(sku)) {
    return false;
  }

  // 2. Check if quantity is below threshold
  if (quantity >= min_qty) {
    return false;
  }

  // 3. Check if we are in cooldown
  if (isCoolingDown(sku, cooldown_minutes)) {
    return false;
  }

  return true;
}

/**
 * Helper to clear history (used for testing)
 */
export function _clearAlertHistory() {
  alertHistory.clear();
}
