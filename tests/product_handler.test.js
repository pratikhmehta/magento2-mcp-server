import { ProductHandler } from '../src/handlers/product_handler.js';
import { magento } from '../src/lib/magento.js';

jest.mock('../src/lib/magento.js');

describe('ProductHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBySku', () => {
    it('should fetch a product by SKU successfully', async () => {
      const mockProduct = { sku: 'TEST-SKU', name: 'Test Product', price: 100 };
      magento.get.mockResolvedValue(mockProduct);

      const result = await ProductHandler.getBySku({ sku: 'TEST-SKU' });

      expect(magento.get).toHaveBeenCalledWith('/products/TEST-SKU');
      expect(result).toEqual(mockProduct);
    });

    it('should handle store-scoped 404 with fallback', async () => {
      const mockProduct = { sku: 'TEST-SKU', name: 'Global Product' };
      
      // First call fails with store-scoped 404
      magento.get
        .mockRejectedValueOnce({ status: 404, message: 'store not found' })
        .mockResolvedValueOnce(mockProduct);

      const result = await ProductHandler.getBySku({ sku: 'TEST-SKU' });

      expect(magento.get).toHaveBeenCalledTimes(2);
      expect(magento.get).toHaveBeenNthCalledWith(2, '../all/V1/products/TEST-SKU');
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product truly does not exist', async () => {
      magento.get.mockRejectedValue({ status: 404, message: 'not found' });

      await expect(ProductHandler.getBySku({ sku: 'NO-EXIST' }))
        .rejects.toThrow('Product with SKU "NO-EXIST" not found.');
    });
  });

  describe('list', () => {
    it('should list products with category filter', async () => {
      magento.get.mockResolvedValue({ items: [], total_count: 0 });

      await ProductHandler.list({ category_id: '15', limit: 5 });

      const calledUrl = magento.get.mock.calls[0][0];
      expect(calledUrl).toContain('searchCriteria[filter_groups][0][filters][0][field]=category_id');
      expect(calledUrl).toContain('searchCriteria[filter_groups][0][filters][0][value]=15');
      expect(calledUrl).toContain('searchCriteria[pageSize]=5');
    });

    it('should list products with search term', async () => {
      magento.get.mockResolvedValue({ items: [], total_count: 0 });

      await ProductHandler.list({ search: 'Shirt' });

      const calledUrl = magento.get.mock.calls[0][0];
      expect(calledUrl).toContain('searchCriteria[filter_groups][0][filters][0][field]=name');
      expect(calledUrl).toContain('searchCriteria[filter_groups][0][filters][0][value]=%Shirt%');
      expect(calledUrl).toContain('searchCriteria[filter_groups][0][filters][0][condition_type]=like');
    });
  });
});
