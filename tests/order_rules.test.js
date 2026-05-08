import { applyRules, describeRules } from '../src/handlers/order_rules.js';

describe('Order Rules Engine', () => {
  
  test('describeRules should return a list of rules', () => {
    const rules = describeRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });

  describe('applyRules', () => {
    
    test('Rule: paid + paypal -> auto_fulfill', () => {
      const order = { 
        grand_total: 100, 
        payment: { method: 'paypal' },
        increment_id: '001'
      };
      const result = applyRules(order, 'paid');
      expect(result.action).toBe('auto_fulfill');
      expect(result.payload.reason).toMatch(/PayPal/);
    });

    test('Rule: paid + low total -> auto_fulfill', () => {
      const order = { 
        grand_total: 45, 
        payment: { method: 'checkmo' },
        increment_id: '002'
      };
      const result = applyRules(order, 'paid');
      expect(result.action).toBe('auto_fulfill');
      expect(result.payload.reason).toMatch(/Low value/);
    });

    test('Rule: cancelled -> restock_items', () => {
      const order = { increment_id: '003' };
      const result = applyRules(order, 'cancelled');
      expect(result.action).toBe('restock_items');
    });

    test('Rule: new + wholesale -> flag_for_review', () => {
      const order = { 
        customer_group_id: 2, 
        increment_id: '004' 
      };
      const result = applyRules(order, 'new');
      expect(result.action).toBe('flag_for_review');
    });

    test('should return null if no rule matches', () => {
      const order = { 
        grand_total: 500, 
        payment: { method: 'checkmo' },
        customer_group_id: 1,
        increment_id: '005'
      };
      const result = applyRules(order, 'paid');
      expect(result).toBeNull();
    });

  });
});
