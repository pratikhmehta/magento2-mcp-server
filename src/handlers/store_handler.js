import { magento } from '../lib/magento.js';
import { logger } from '../../logger.js';
import { cacheGet, cacheSet, TTL } from '../lib/cache.js';

export class StoreHandler {
  /**
   * List all store views with their website and group mappings
   */
  static async listStores() {
    const cacheKey = 'store:list';
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const stores = await magento.get('/store/storeViews');
      const groups = await magento.get('/store/storeGroups');
      const websites = await magento.get('/store/websites');

      const result = {
        websites: websites.map(w => ({ id: w.id, code: w.code, name: w.name })),
        groups: groups.map(g => ({ id: g.id, name: g.name, website_id: g.website_id })),
        store_views: stores.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          website_id: s.website_id,
          is_active: s.is_active === 1
        }))
      };

      cacheSet(cacheKey, result, TTL.orders); // Use orders TTL or similar
      return result;
    } catch (error) {
      logger.error('STORE_LIST_ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * Get general store configurations (name, locale, currency)
   */
  static async getStoreConfigs() {
    const cacheKey = 'store:configs';
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
      const configs = await magento.get('/store/storeConfigs');
      cacheSet(cacheKey, configs, TTL.orders);
      return configs;
    } catch (error) {
      logger.error('STORE_CONFIG_ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * Get product details localized for a specific store view
   */
  static async getLocalizedProduct(args) {
    const { sku, store_code } = args;
    if (!sku || !store_code) {
      throw new Error("Both SKU and store_code are required.");
    }

    try {
      const product = await magento.get(`/products/${sku}`, {}, store_code);
      return {
        sku: product.sku,
        store_view: store_code,
        name: product.name,
        price: product.price,
        description: product.custom_attributes?.find(a => a.attribute_code === 'description')?.value || "No description",
        status: product.status === 1 ? "Enabled" : "Disabled"
      };
    } catch (error) {
      logger.error('STORE_PRODUCT_LOCALIZED_ERROR', { sku, store_code, error: error.message });
      throw error;
    }
  }
}
