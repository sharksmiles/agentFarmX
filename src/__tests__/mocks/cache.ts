/**
 * Mock for CacheService
 */

export const CacheService = {
  getOrSet: jest.fn().mockImplementation(async (key: string, fn: () => any, options?: any) => {
    return fn();
  }),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  deleteByPattern: jest.fn().mockResolvedValue(undefined),
};

export const CacheKey = {
  USER_BY_ID: 'user:',
  FARM_STATE_BY_USER_ID: 'farm_state:',
  CROP_CONFIGS: 'crop_configs',
  CROP_CONFIG_BY_ID: 'crop_config:',
  LEVEL_CONFIGS: 'level_configs',
  LEVEL_CONFIG_BY_ID: 'level_config:',
  SYSTEM_CONFIG: 'system_config:',
};

export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
};
