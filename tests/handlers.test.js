import { InventoryHandler } from '../src/handlers/inventory_handler.js';
import { OrderAutomationHandler } from '../src/handlers/order_automation_handler.js';
import { magento } from '../src/lib/magento.js';

// Mock Magento lib
jest.mock('../src/lib/magento.js');

describe('Magento Handlers', () => {
  
  describe('InventoryHandler', () => {
    test('getLowStock should call magento.get with correct threshold', async () => {
      magento.get.mockResolvedValue({ items: [] });
      await InventoryHandler.getLowStock({ threshold: 5 });
      expect(magento.get).toHaveBeenCalledWith(expect.stringContaining('value=5'), expect.anything(), null);
    });

    test('checkStock should call magento.get with SKU', async () => {
      magento.get.mockResolvedValue({ sku: 'TEST' });
      await InventoryHandler.checkStock({ sku: 'TEST' });
      expect(magento.get).toHaveBeenCalledWith('/stockItems/TEST', expect.anything(), null);
    });
  });

  describe('OrderAutomationHandler', () => {
    test('listRecent should call magento.get with status', async () => {
      magento.get.mockResolvedValue({ items: [] });
      await OrderAutomationHandler.listRecent({ status: 'complete' });
      expect(magento.get).toHaveBeenCalledWith(expect.stringContaining('value=complete'), expect.anything(), null);
    });
  });

});
