import {
  memoize,
  memoizeAsync,
  memoizeWithKey,
  LRUCache,
  debounce,
  throttle,
  once,
  Lazy,
  ResourcePool,
  BatchProcessor,
} from '../../src/utils/memoization';

describe('Memoization Utilities', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);

      // Function should only be called once for same input
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache different inputs separately', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(memoized(5)).toBe(10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle complex return types', () => {
      const fn = jest.fn((x: number) => ({ value: x * 2 }));
      const memoized = memoize(fn);

      const result1 = memoized(5);
      const result2 = memoized(5);

      expect(result1).toBe(result2); // Same object reference
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('memoizeAsync', () => {
    beforeAll(() => {
      jest.useRealTimers();
    });

    it('should cache async function results', async () => {
      const fn = jest.fn(async (x: number) => {
        return x * 2;
      });
      const memoized = memoizeAsync(fn);

      const result1 = await memoized(5);
      const result2 = await memoized(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent calls', async () => {
      const fn = jest.fn(async (x: number) => {
        await new Promise((r) => setTimeout(r, 10));
        return x * 2;
      });
      const memoized = memoizeAsync(fn);

      // Start 3 concurrent calls
      const [result1, result2, result3] = await Promise.all([
        memoized(5),
        memoized(5),
        memoized(5),
      ]);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(result3).toBe(10);

      // Should only call function once, not 3 times
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors', async () => {
      const fn = jest.fn(async () => {
        throw new Error('Test error');
      });
      const memoized = memoizeAsync(fn);

      await expect(memoized(5)).rejects.toThrow('Test error');
    });
  });

  describe('memoizeWithKey', () => {
    it('should use custom key generator', () => {
      const fn = jest.fn((a: number, b: number) => a + b);
      const memoized = memoizeWithKey(fn, (a, b) => `${a}-${b}`);

      expect(memoized(2, 3)).toBe(5);
      expect(memoized(2, 3)).toBe(5);
      expect(memoized(3, 2)).toBe(5); // Different key

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle complex arguments', () => {
      const fn = jest.fn((obj: { x: number; y: number }) => obj.x + obj.y);
      const memoized = memoizeWithKey(fn, (obj) => `${obj.x},${obj.y}`);

      expect(memoized({ x: 2, y: 3 })).toBe(5);
      expect(memoized({ x: 2, y: 3 })).toBe(5); // Same key

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('LRUCache', () => {
    beforeAll(() => {
      jest.useRealTimers();
    });

    it('should evict oldest entry when full', () => {
      const cache = new LRUCache<number, string>(2, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three'); // Evicts 1

      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);
      expect(cache.has(3)).toBe(true);
    });

    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<number, string>(10, 50); // 50ms TTL

      cache.set(1, 'one');
      expect(cache.get(1)).toBe('one');

      // Wait for expiration
      await new Promise((r) => setTimeout(r, 100));

      expect(cache.get(1)).toBeUndefined();
    });

    it('should update LRU order on access', () => {
      const cache = new LRUCache<number, string>(2, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');

      // Access 1 (makes it most recently used)
      cache.get(1);

      // Add 3 (should evict 2, not 1)
      cache.set(3, 'three');

      expect(cache.has(1)).toBe(true);
      expect(cache.has(2)).toBe(false);
      expect(cache.has(3)).toBe(true);
    });

    it('should track hit statistics', () => {
      const cache = new LRUCache<number, string>(10, 60000);

      cache.set(1, 'one');
      cache.get(1); // Hit
      cache.get(1); // Hit
      cache.get(2); // Miss

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.entries.length).toBe(1);
      expect(stats.entries[0].hits).toBe(2);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<number, string>(10, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.clear();

      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(false);
      expect(cache.getStats().size).toBe(0);
    });

    it('should delete specific entry', () => {
      const cache = new LRUCache<number, string>(10, 60000);

      cache.set(1, 'one');
      cache.set(2, 'two');

      expect(cache.delete(1)).toBe(true);
      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);

      expect(cache.delete(1)).toBe(false); // Already deleted
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      jest.advanceTimersByTime(50);
      debounced(); // Cancels previous call
      jest.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should limit execution rate', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled(); // Executes immediately
      expect(fn).toHaveBeenCalledTimes(1);

      throttled(); // Ignored (within throttle period)
      throttled(); // Ignored
      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(101);
      throttled(); // Executes after throttle period
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('once', () => {
    it('should execute function only once', () => {
      const fn = jest.fn(() => 42);
      const onceFn = once(fn);

      expect(onceFn()).toBe(42);
      expect(onceFn()).toBe(42);
      expect(onceFn()).toBe(42);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should preserve return value', () => {
      const fn = jest.fn(() => ({ value: 42 }));
      const onceFn = once(fn);

      const result1 = onceFn();
      const result2 = onceFn();

      expect(result1).toBe(result2); // Same object reference
    });
  });

  describe('Lazy', () => {
    it('should defer initialization', () => {
      const factory = jest.fn(() => ({ value: 42 }));
      const lazy = new Lazy(factory);

      expect(factory).not.toHaveBeenCalled();

      const value1 = lazy.getValue();
      expect(factory).toHaveBeenCalledTimes(1);
      expect(value1.value).toBe(42);

      const value2 = lazy.getValue();
      expect(factory).toHaveBeenCalledTimes(1); // Not called again
      expect(value1).toBe(value2); // Same instance
    });

    it('should handle async initialization', async () => {
      const factory = jest.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { value: 42 };
      });
      const lazy = new Lazy(factory);

      const value = await lazy.getValue();
      expect(value.value).toBe(42);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('ResourcePool', () => {
    it('should reuse resources', async () => {
      let created = 0;
      const pool = new ResourcePool(
        () => ({ id: ++created }),
        () => {},
        5
      );

      const r1 = await pool.acquire();
      expect(r1.id).toBe(1);

      pool.release(r1);

      const r2 = await pool.acquire();
      expect(r2.id).toBe(1); // Reused, not created new
      expect(created).toBe(1);
    });

    it('should create up to maxSize resources', async () => {
      let created = 0;
      const pool = new ResourcePool(
        () => ({ id: ++created }),
        () => {},
        3
      );

      const r1 = await pool.acquire();
      const r2 = await pool.acquire();
      const r3 = await pool.acquire();

      expect(r1.id).toBe(1);
      expect(r2.id).toBe(2);
      expect(r3.id).toBe(3);
      expect(created).toBe(3);
    });

    it('should dispose all resources', async () => {
      const disposed: number[] = [];
      const pool = new ResourcePool(
        () => ({ id: Math.random() }),
        (r) => disposed.push(r.id),
        5
      );

      const r1 = await pool.acquire();
      const r2 = await pool.acquire();

      pool.release(r1);
      pool.release(r2);

      await pool.disposeAll();

      expect(disposed).toContain(r1.id);
      expect(disposed).toContain(r2.id);
    });
  });

  describe('BatchProcessor', () => {
    beforeAll(() => {
      jest.useRealTimers();
    });

    it('should batch items together', async () => {
      const processBatch = jest.fn(async (items: number[]) => {
        return items.map((x) => x * 2);
      });

      const processor = new BatchProcessor(processBatch, 3, 1000);

      const results = await Promise.all([
        processor.add(1),
        processor.add(2),
        processor.add(3),
      ]);

      expect(results).toEqual([2, 4, 6]);
      expect(processBatch).toHaveBeenCalledTimes(1);
      expect(processBatch).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should flush on max batch size', async () => {
      const processBatch = jest.fn(async (items: number[]) => {
        return items.map((x) => x * 2);
      });

      const processor = new BatchProcessor(processBatch, 2, 10000);

      const results = await Promise.all([processor.add(1), processor.add(2)]);

      expect(results).toEqual([2, 4]);
      expect(processBatch).toHaveBeenCalledTimes(1);
    });

    it('should flush on timeout', async () => {
      const processBatch = jest.fn(async (items: number[]) => {
        return items.map((x) => x * 2);
      });

      const processor = new BatchProcessor(processBatch, 10, 50);

      const resultPromise = processor.add(1);

      await new Promise((r) => setTimeout(r, 100));

      const result = await resultPromise;
      expect(result).toBe(2);
      expect(processBatch).toHaveBeenCalledTimes(1);
    });
  });
});
