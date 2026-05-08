import { magento } from '../lib/magento.js';

/**
 * Product Management Handler
 */
export const ProductHandler = {
  /**
   * Get product details by SKU
   */
  async getBySku(args) {
    const { sku } = args;
    try {
      return await magento.get(`/products/${encodeURIComponent(sku)}`);
    } catch (error) {
      if (error.status === 404) {
        if (error.message.includes('store')) {
          // Fallback to /all/V1 for store-scoped 404
          return await magento.get(`../all/V1/products/${encodeURIComponent(sku)}`);
        }
        throw new Error(`Product with SKU "${sku}" not found.`);
      }
      throw error;
    }
  },

  /**
   * List products with filtering
   */
  async list(args) {
    const { category_id, limit = 10, search = '' } = args;
    
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

    const searchCriteria = filters.join('&') + (filters.length ? '&' : '') + `searchCriteria[pageSize]=${limit}`;
    
    try {
      return await magento.get(`/products?${searchCriteria}`);
    } catch (error) {
      if (error.status === 404 && error.message.includes('store')) {
        return await magento.get(`../all/V1/products?${searchCriteria}`);
      }
      throw error;
    }
  }
};
