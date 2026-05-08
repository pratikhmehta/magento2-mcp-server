import { createRateLimiter, deduplicateAlert } from '../src/lib/rate_limiter.js';

describe('Rate Limiter Library', () => {
  
  describe('createRateLimiter', () => {
    test('should allow requests within limit', () => {
      const limiter = createRateLimiter('test', { max_per_minute: 2 });
      
      expect(limiter.check('user1').allowed).toBe(true);
      expect(limiter.check('user1').allowed).toBe(true);
      expect(limiter.check('user1').allowed).toBe(false);
    });

    test('should track different keys separately', () => {
      const limiter = createRateLimiter('test', { max_per_minute: 1 });
      
      expect(limiter.check('user1').allowed).toBe(true);
      expect(limiter.check('user2').allowed).toBe(true);
      expect(limiter.check('user1').allowed).toBe(false);
    });

    test('should calculate retry_after_ms correctly', () => {
      const limiter = createRateLimiter('test', { max_per_minute: 1 });
      limiter.check('user1');
      const status = limiter.check('user1');
      
      expect(status.allowed).toBe(false);
      expect(status.retry_after_ms).toBeGreaterThan(0);
      expect(status.retry_after_ms).toBeLessThanOrEqual(60000);
    });
  });

  describe('deduplicateAlert', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should only allow new alerts', () => {
      expect(deduplicateAlert('SKU-1', 1000)).toBe(true);
      expect(deduplicateAlert('SKU-1', 1000)).toBe(false);
    });

    test('should allow alert again after TTL window', () => {
      deduplicateAlert('SKU-2', 5000);
      expect(deduplicateAlert('SKU-2', 5000)).toBe(false);
      
      jest.advanceTimersByTime(5001);
      
      expect(deduplicateAlert('SKU-2', 5000)).toBe(true);
    });
  });

});
