import { magento } from '../lib/magento.js';
import { cacheGet, cacheSet, TTL } from '../lib/cache.js';
import { sendAlert } from './notifier.js';
import { jsonToCsv } from '../lib/utils.js';

/**
 * Product Management Handler
 * All read operations are cached for fast repeat queries.
 */
export const ProductHandler = {
  /**
   * Get product details by SKU (cached)
   */
  async getBySku(args) {
    const { sku } = args;
    const cacheKey = `products:get:${sku}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error(`[CACHE] Returning cached product ${sku}`);
      return cached;
    }

    try {
      const data = await magento.get(`/products/${encodeURIComponent(sku)}`);
      cacheSet(cacheKey, data, TTL.products);
      return data;
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Product with SKU "${sku}" not found.`);
      }
      throw error;
    }
  },

  /**
   * List products with filtering and sorting (cached)
   */
  async list(args) {
    const { category_id, limit = 10, search = '', sort_field = 'created_at', sort_direction = 'DESC' } = args;
    const cacheKey = `products:list:${category_id || 'all'}:${search}:${limit}:${sort_field}:${sort_direction}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error('[CACHE] Returning cached product list');
      return cached;
    }

    let filters = [];
    let groupIndex = 0;

    if (category_id) {
      filters.push(`searchCriteria[filter_groups][${groupIndex}][filters][0][field]=category_id&` +
                   `searchCriteria[filter_groups][${groupIndex}][filters][0][value]=${category_id}`);
      groupIndex++;
    }

    if (search) {
      filters.push(`searchCriteria[filter_groups][${groupIndex}][filters][0][field]=name&` +
                   `searchCriteria[filter_groups][${groupIndex}][filters][0][value]=%${search}%&` +
                   `searchCriteria[filter_groups][${groupIndex}][filters][0][condition_type]=like`);
      groupIndex++;
    }

    let searchCriteria = filters.join('&') + (filters.length ? '&' : '') + 
                        `searchCriteria[pageSize]=${limit}&` +
                        `searchCriteria[sortOrders][0][field]=${sort_field}&` +
                        `searchCriteria[sortOrders][0][direction]=${sort_direction}`;
    
    try {
      const data = await magento.get(`/products?${searchCriteria}`);
      cacheSet(cacheKey, data, TTL.products);
      return data;
    } catch (error) {
      throw new Error(`Failed to list products: ${error.message}`);
    }
  },

  /**
   * List high value products (filtered in memory)
   */
  async getHighValueProducts(args) {
    let { min_price = 0, limit = 5, send_notification = false } = args;
    
    // Security: Cap limit to prevent memory exhaustion
    if (limit > 100) limit = 100;

    // Fetch a batch of products
    const searchLimit = 50;
    const searchCriteria = `searchCriteria[pageSize]=${searchLimit}&` +
                           `searchCriteria[sortOrders][0][field]=price&` +
                           `searchCriteria[sortOrders][0][direction]=DESC`;

    try {
      const response = await magento.get(`/products?${searchCriteria}`);
      const products = response.items || [];
      
      const filtered = products
        .filter(p => parseFloat(p.price) >= min_price)
        .slice(0, limit)
        .map(p => ({
          sku: p.sku,
          name: p.name,
          price: p.price,
          type: p.type_id,
          status: p.status === 1 ? 'Enabled' : 'Disabled'
        }));

      // Send alert if requested and matches found
      if (send_notification && filtered.length > 0) {
        await sendAlert({
          type: 'high_value_products',
          subject: `ALERT: High Value Products Detected (>= ${min_price})`,
          body: `Found ${filtered.length} products matching your criteria. Full report attached as CSV.`,
          csvData: jsonToCsv(filtered)
        });
      }

      return filtered;
    } catch (error) {
      throw new Error(`Failed to list high value products: ${error.message}`);
    }
  }
};
