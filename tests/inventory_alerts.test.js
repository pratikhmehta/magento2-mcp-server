import { InventoryAlertHandler } from '../src/handlers/inventory_alerts_handler.js';
import { magento } from '../src/lib/magento.js';

jest.mock('../src/lib/magento.js');

describe('InventoryAlertHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return low stock items below threshold', async () => {
    const mockItems = [
      { sku: 'LOW-01', source_code: 'default', quantity: 5, status: 1 },
      { sku: 'OK-01', source_code: 'default', quantity: 20, status: 1 }
    ];
    
    // The handler receives the response with items already filtered by Magento via searchCriteria
    // but for the sake of the test we mock what magento.get returns
    magento.get.mockResolvedValue({ items: [mockItems[0]] });

    const result = await InventoryAlertHandler.checkAlerts({ threshold: 10 });
    
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('LOW-01');
    expect(magento.get).toHaveBeenCalledWith(expect.stringContaining('value=10'), expect.anything(), null);
  });

  test('should apply SKU glob filter', async () => {
    const mockItems = [
      { sku: 'SHIRT-RED', source_code: 'wh1', quantity: 2, status: 1 },
      { sku: 'PANT-BLUE', source_code: 'wh1', quantity: 1, status: 1 }
    ];
    
    magento.get.mockResolvedValue({ items: mockItems });

    const result = await InventoryAlertHandler.checkAlerts({ threshold: 10, sku_filter: 'SHIRT-*' });
    
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('SHIRT-RED');
  });

  test('should return healthy message if no items found', async () => {
    magento.get.mockResolvedValue({ items: [] });

    const result = await InventoryAlertHandler.checkAlerts({ threshold: 10 });
    
    expect(result.message).toBe('All stock levels healthy');
  });

  test('should propagate API errors', async () => {
    magento.get.mockRejectedValue(new Error('Network Timeout'));

    await expect(InventoryAlertHandler.checkAlerts({ threshold: 10 }))
      .rejects.toThrow('Network Timeout');
  });
});
