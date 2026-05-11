import { magento } from '../lib/magento.js';
import { logger } from '../../logger.js';

export class InventoryHandler {
  /**
   * Get product stock quantity per source (MSI)
   * @param {Object} args - { sku: string }
   */
  static async getStockPerSource(args) {
    const { sku } = args;

    if (!sku) {
      throw new Error("SKU is required.");
    }

    logger.info("INVENTORY_STOCK_CHECK_STARTED", { sku });

    try {
      // 1. Fetch source items (MSI quantities)
      const siResponse = await magento.get(`/inventory/source-items?searchCriteria[filterGroups][0][filters][0][field]=sku&searchCriteria[filterGroups][0][filters][0][value]=${sku}`);
      const sourceItems = siResponse.items || [];

      if (sourceItems.length === 0) {
        // Fallback or check if product exists
        try {
          await magento.get(`/products/${sku}`);
          return {
            sku,
            message: "Product found but no MSI sources are mapped to it. Check legacy stock or catalog configurations.",
            sources: []
          };
        } catch (e) {
          throw new Error(`Product with SKU '${sku}' not found.`);
        }
      }

      // 2. Fetch store views to map source codes to human-readable names if possible
      // Note: Source codes and Store codes are often similar but not always identical.
      // We'll return the source items as the primary data.
      
      const totalQty = sourceItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      logger.info("INVENTORY_STOCK_CHECK_SUCCESS", { sku, source_count: sourceItems.length, total_qty: totalQty });

      return {
        sku,
        total_quantity: totalQty,
        source_count: sourceItems.length,
        sources: sourceItems.map(item => ({
          source_code: item.source_code,
          quantity: item.quantity,
          status: item.status === 1 ? "In Stock" : "Out of Stock"
        }))
      };
    } catch (error) {
      logger.error("INVENTORY_STOCK_CHECK_ERROR", { sku, error: error.message });
      throw error;
    }
  }

  /**
   * List all inventory sources (MSI)
   */
  static async listSources() {
    logger.info("INVENTORY_SOURCES_LIST_STARTED");
    try {
      const response = await magento.get('/inventory/sources');
      const sources = response.items || [];
      logger.info("INVENTORY_SOURCES_LIST_SUCCESS", { count: sources.length });
      return sources.map(s => ({
        source_code: s.source_code,
        name: s.name,
        enabled: s.enabled,
        description: s.description,
        contact_name: s.contact_name,
        postcode: s.postcode,
        city: s.city
      }));
    } catch (error) {
      logger.error("INVENTORY_SOURCES_LIST_ERROR", { error: error.message });
      throw error;
    }
  }
}
