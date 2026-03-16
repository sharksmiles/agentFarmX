/**
 * Redis Cache Mock
 * 模拟 Redis 缓存服务
 */

export const cacheMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  keys: jest.fn(),
  scan: jest.fn(),
};

/**
 * 设置缓存命中 Mock
 */
export function mockCacheHit<T>(key: string, value: T) {
  cacheMock.get.mockImplementation(async (k: string) => {
    if (k === key) {
      return JSON.stringify(value);
    }
    return null;
  });
}

/**
 * 设置缓存未命中 Mock
 */
export function mockCacheMiss() {
  cacheMock.get.mockResolvedValue(null);
}

/**
 * 设置缓存设置成功 Mock
 */
export function mockCacheSetSuccess() {
  cacheMock.set.mockResolvedValue('OK');
}

/**
 * 重置所有 Mock
 */
export function resetCacheMock() {
  jest.clearAllMocks();
}

/**
 * 使用方式：
 * jest.mock('@/lib/cache', () => ({
 *   CacheService: {
 *     get: cacheMock.get,
 *     set: cacheMock.set,
 *     delete: cacheMock.del,
 *   },
 * }));
 */
