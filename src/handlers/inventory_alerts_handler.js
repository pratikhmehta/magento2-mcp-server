import { magento } from '../lib/magento.js';
import { minimatch } from 'minimatch';
import { cacheGet, cacheSet, TTL } from '../lib/cache.js';
import { sendAlert } from './notifier.js';
import { jsonToCsv } from '../lib/utils.js';

/**
 * Inventory Alert Business Logic
 * Uses Products API for maximum search compatibility.
 * All read operations are cached.
 */
export const InventoryAlertHandler = {
  /**
   * Checks for inventory alerts using the Products API (cached)
   */
  async checkAlerts(args) {
    const { threshold = 10, sku_filter, send_notification = false } = args;
    const cacheKey = `inventory:alerts:${threshold}:${sku_filter || 'all'}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error('[CACHE] Returning cached inventory alerts');
      return cached;
    }

    const searchCriteria = `searchCriteria[pageSize]=20&` +
                           `searchCriteria[sortOrders][0][field]=created_at&` +
                           `searchCriteria[sortOrders][0][direction]=DESC`;
    
    try {
      console.error('[API] Fetching recent products to check stock levels...');
      const response = await magento.get(`/products?${searchCriteria}`);
      let products = response.items || [];

      // Filter by SKU if requested
      if (sku_filter && products.length > 0) {
        products = products.filter(p => minimatch(p.sku, sku_filter));
      }

      // Filter by quantity threshold
      const lowStockItems = products.filter(p => {
        const stockItem = p.extension_attributes ? p.extension_attributes.stock_item : null;
        const qty = stockItem ? stockItem.qty : undefined;
        return qty !== undefined && qty < threshold;
      });

      let result;
      if (lowStockItems.length === 0) {
        result = { message: "All stock levels are above threshold.", checked: products.length };
      } else {
        result = lowStockItems.map(p => {
          const stockItem = p.extension_attributes ? p.extension_attributes.stock_item : {};
          return {
            sku: p.sku,
            name: p.name,
            qty: stockItem.qty,
            status: stockItem.is_in_stock ? 'In Stock' : 'Out of Stock'
          };
        });

        // Send notification if requested
        if (send_notification) {
          await sendAlert({
            type: 'low_stock',
            subject: `ALERT: Inventory Alert: ${result.length} Items Low on Stock`,
            body: `Found ${result.length} items below the threshold of ${threshold}. Full report attached as CSV.`,
            csvData: jsonToCsv(result)
          });
        }
      }

      cacheSet(cacheKey, result, TTL.inventory);
      return result;
    } catch (error) {
      throw new Error(`Inventory check failed: ${error.message}`);
    }
  },

  /**
   * General stock level fetch
   */
  async getLowStock(args) {
    return await this.checkAlerts(args);
  },

  /**
   * Checks specific SKU stock (cached)
   */
  async checkStock(args) {
    const { sku } = args;
    const cacheKey = `inventory:sku:${sku}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error(`[CACHE] Returning cached stock for ${sku}`);
      return cached;
    }

    try {
      const product = await magento.get(`/products/${sku}`);
      const stockItem = product.extension_attributes ? product.extension_attributes.stock_item : {};
      const result = {
        sku: product.sku,
        name: product.name,
        qty: stockItem.qty,
        is_in_stock: stockItem.is_in_stock
      };
      cacheSet(cacheKey, result, TTL.inventory);
      return result;
    } catch (error) {
      throw new Error(`Failed to check SKU ${sku}: ${error.message}`);
    }
  }
};
