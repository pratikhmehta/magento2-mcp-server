import { shouldAlert, recordAlertSent, isCoolingDown, _clearAlertHistory } from '../src/handlers/alert_rules.js';

describe('Alert Rules Handler', () => {
  beforeEach(() => {
    _clearAlertHistory();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recordAlertSent & isCoolingDown', () => {
    test('should return true if SKU was sent recently', () => {
      recordAlertSent('SKU-1');
      expect(isCoolingDown('SKU-1', 10)).toBe(true);
    });

    test('should return false if SKU was never sent', () => {
      expect(isCoolingDown('NEW-SKU', 10)).toBe(false);
    });

    test('should return false if cooldown period has passed', () => {
      recordAlertSent('SKU-1');
      
      // Advance time by 11 minutes
      jest.advanceTimersByTime(11 * 60 * 1000);
      
      expect(isCoolingDown('SKU-1', 10)).toBe(false);
    });
  });

  describe('shouldAlert', () => {
    const rules = {
      min_qty: 10,
      cooldown_minutes: 30,
      skus_exclude: ['EXCLUDE-ME']
    };

    test('should return true for low stock item not in cooldown', () => {
      const item = { sku: 'TEST-SKU', quantity: 5 };
      expect(shouldAlert(item, rules)).toBe(true);
    });

    test('should return false if SKU is in exclude list', () => {
      const item = { sku: 'EXCLUDE-ME', quantity: 5 };
      expect(shouldAlert(item, rules)).toBe(false);
    });

    test('should return false if quantity is equal or above min_qty', () => {
      const item = { sku: 'TEST-SKU', quantity: 10 };
      expect(shouldAlert(item, rules)).toBe(false);
    });

    test('should return false if item is in cooldown', () => {
      const item = { sku: 'TEST-SKU', quantity: 5 };
      recordAlertSent('TEST-SKU');
      expect(shouldAlert(item, rules)).toBe(false);
    });
  });
});
