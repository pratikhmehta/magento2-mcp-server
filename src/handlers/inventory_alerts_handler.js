import { magento } from '../lib/magento.js';
import { minimatch } from 'minimatch';

/**
 * Inventory Alert Business Logic
 * Pivot to Products API for maximum search compatibility
 */
export const InventoryAlertHandler = {
  /**
   * Checks for inventory alerts using the Products API
   */
  async checkAlerts(args) {
    const { threshold = 10, sku_filter } = args;

    // Use Products API search - this is standard across all Magento 2 versions
    // Note: We search for products, then check their stock
    const searchCriteria = `searchCriteria[pageSize]=20&` +
                           `searchCriteria[sortOrders][0][field]=created_at&` +
                           `searchCriteria[sortOrders][0][direction]=DESC`;
    
    try {
      console.error('📡 Fetching recent products to check stock levels...');
      const response = await magento.get(`/products?${searchCriteria}`);
      let products = response.items || [];

      // Filter by SKU if requested
      if (sku_filter && products.length > 0) {
        products = products.filter(p => minimatch(p.sku, sku_filter));
      }

      // Filter by quantity threshold manually if the API search on extension attributes is blocked
      const lowStockItems = products.filter(p => {
        const qty = p.extension_attributes?.stock_item?.qty;
        return qty !== undefined && qty < threshold;
      });

      if (lowStockItems.length === 0) {
        return { message: "Checked recent products; all stock levels above threshold." };
      }

      return lowStockItems.map(p => ({
        sku: p.sku,
        name: p.name,
        qty: p.extension_attributes?.stock_item?.qty,
        status: p.extension_attributes?.stock_item?.is_in_stock ? 'In Stock' : 'Out of Stock'
      }));
    } catch (error) {
      throw new Error(`Inventory check failed via Products API: ${error.message}`);
    }
  },

  /**
   * General stock level fetch
   */
  async getLowStock(args) {
    return await this.checkAlerts(args);
  },

  /**
   * Checks specific SKU stock
   */
  async checkStock(args) {
    const { sku } = args;
    try {
      const product = await magento.get(`/products/${sku}`);
      return {
        sku: product.sku,
        name: product.name,
        qty: product.extension_attributes?.stock_item?.qty,
        is_in_stock: product.extension_attributes?.stock_item?.is_in_stock
      };
    } catch (error) {
      throw new Error(`Failed to check SKU ${sku}: ${error.message}`);
    }
  }
};
