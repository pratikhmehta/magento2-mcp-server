import { classifyIntent, needsEscalation } from '../src/handlers/intent_classifier.js';

describe('Intent Classifier', () => {
  
  describe('classifyIntent', () => {
    test('should detect order_status with high confidence', () => {
      const result = classifyIntent('Where is my order? I want to track it.');
      expect(result.intent).toBe('order_status');
      expect(result.confidence).toBe('high');
    });

    test('should detect return intent', () => {
      const result = classifyIntent('I want to start a refund for my item');
      expect(result.intent).toBe('return');
    });

    test('should detect complaint intent', () => {
      const result = classifyIntent('The item arrived broken and it is terrible');
      expect(result.intent).toBe('complaint');
      expect(result.confidence).toBe('high');
    });

    test('should return other for unknown patterns', () => {
      const result = classifyIntent('Hello how are you today');
      expect(result.intent).toBe('other');
    });
  });

  describe('needsEscalation', () => {
    test('should escalate when asking for a human', () => {
      expect(needsEscalation('other', 'I want to talk to a human person')).toBe(true);
    });

    test('should escalate for serious complaints', () => {
      expect(needsEscalation('complaint', 'This is fraud I will call my lawyer')).toBe(true);
    });

    test('should NOT escalate for simple questions', () => {
      expect(needsEscalation('product_question', 'What is the size of this?')).toBe(false);
    });
  });

});
