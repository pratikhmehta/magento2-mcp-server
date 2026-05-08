import { InventoryHandler, OrderHandler } from '../src/handlers/magento_handlers.js';
import { magento } from '../src/lib/magento.js';

// Mock Magento lib
jest.mock('../src/lib/magento.js');

describe('Magento Handlers', () => {
  
  describe('InventoryHandler', () => {
    test('getLowStock should call magento.get with correct threshold', async () => {
      magento.get.mockResolvedValue({ items: [] });
      await InventoryHandler.getLowStock({ threshold: 5 });
      expect(magento.get).toHaveBeenCalledWith(expect.stringContaining('value=5'));
    });

    test('checkStock should call magento.get with SKU', async () => {
      magento.get.mockResolvedValue({ sku: 'TEST' });
      await InventoryHandler.checkStock({ sku: 'TEST' });
      expect(magento.get).toHaveBeenCalledWith('/stockItems/TEST');
    });
  });

  describe('OrderHandler', () => {
    test('listRecent should call magento.get with status', async () => {
      magento.get.mockResolvedValue({ items: [] });
      await OrderHandler.listRecent({ status: 'complete' });
      expect(magento.get).toHaveBeenCalledWith(expect.stringContaining('value=complete'));
    });
  });

});
