/**
 * Redis缓存服务
 * 使用Upstash Redis实现缓存策略
 */

import { Redis } from '@upstash/redis';

// 缓存配置类型
export interface CacheOptions {
  /** 缓存键前缀 */
  prefix?: string;
  /** 过期时间（秒） */
  ttl?: number;
  /** 是否启用缓存（开发环境可禁用） */
  enabled?: boolean;
}

// 默认缓存配置
const DEFAULT_TTL = 300; // 5分钟
const DEFAULT_PREFIX = 'agentfarm:';

// 缓存键枚举
export enum CacheKey {
  // 作物配置
  CROP_CONFIGS = 'crop_configs',
  CROP_CONFIG_BY_ID = 'crop_config:',
  
  // 等级配置
  LEVEL_CONFIGS = 'level_configs',
  LEVEL_CONFIG_BY_ID = 'level_config:',
  
  // 用户农场状态
  USER_FARM_STATE = 'user_farm_state:',
  
  // 用户信息
  USER_PROFILE = 'user_profile:',
  
  // Agent信息
  AGENT_INFO = 'agent_info:',
  AGENT_DECISIONS = 'agent_decisions:',
  
  // 抽奖信息
  RAFFLE_STATE = 'raffle_state:',
  
  // 游戏配置
  GAME_CONFIGS = 'game_configs',
}

// TTL配置（秒）
export const CacheTTL = {
  SHORT: 60,          // 1分钟 - 频繁变化的数据
  MEDIUM: 300,        // 5分钟 - 一般数据
  LONG: 3600,         // 1小时 - 配置数据
  VERY_LONG: 86400,   // 24小时 - 很少变化的数据
};

/**
 * Redis缓存服务类
 */
export class CacheService {
  private static redis: Redis | null = null;
  private static enabled: boolean = true;

  /**
   * 初始化Redis连接
   */
  private static getRedis(): Redis | null {
    if (this.redis) {
      return this.redis;
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[Cache] Redis配置缺失，缓存功能已禁用');
      this.enabled = false;
      return null;
    }

    try {
      this.redis = new Redis({
        url,
        token,
      });
      this.enabled = true;
      return this.redis;
    } catch (error) {
      console.error('[Cache] Redis连接失败:', error);
      this.enabled = false;
      return null;
    }
  }

  /**
   * 检查缓存是否启用
   */
  static isEnabled(): boolean {
    if (!this.enabled) {
      return false;
    }
    return !!this.getRedis();
  }

  /**
   * 构建完整的缓存键
   */
  private static buildKey(key: string, prefix?: string): string {
    return `${prefix || DEFAULT_PREFIX}${key}`;
  }

  /**
   * 获取缓存值
   */
  static async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const redis = this.getRedis();
    if (!redis) return null;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const value = await redis.get<T>(fullKey);
      
      if (value !== null) {
        console.debug(`[Cache] 命中: ${fullKey}`);
      }
      
      return value;
    } catch (error) {
      console.error(`[Cache] 获取失败 (${key}):`, error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  static async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const redis = this.getRedis();
    if (!redis) return false;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || DEFAULT_TTL;

      await redis.setex(fullKey, ttl, JSON.stringify(value));
      console.debug(`[Cache] 设置: ${fullKey}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      console.error(`[Cache] 设置失败 (${key}):`, error);
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  static async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const redis = this.getRedis();
    if (!redis) return false;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      await redis.del(fullKey);
      console.debug(`[Cache] 删除: ${fullKey}`);
      return true;
    } catch (error) {
      console.error(`[Cache] 删除失败 (${key}):`, error);
      return false;
    }
  }

  /**
   * 批量删除匹配模式的缓存
   */
  static async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    const redis = this.getRedis();
    if (!redis) return 0;

    try {
      const fullPattern = this.buildKey(pattern, options?.prefix);
      const keys = await redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      console.debug(`[Cache] 批量删除: ${keys.length} 个键匹配 ${fullPattern}`);
      return keys.length;
    } catch (error) {
      console.error(`[Cache] 批量删除失败 (${pattern}):`, error);
      return 0;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // 执行数据获取
    const value = await fetcher();

    // 设置缓存
    await this.set(key, value, options);

    return value;
  }

  /**
   * 刷新缓存TTL
   */
  static async refresh(key: string, ttl?: number, options?: CacheOptions): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    const redis = this.getRedis();
    if (!redis) return false;

    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const exists = await redis.exists(fullKey);
      
      if (exists) {
        await redis.expire(fullKey, ttl || DEFAULT_TTL);
        console.debug(`[Cache] 刷新TTL: ${fullKey}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`[Cache] 刷新TTL失败 (${key}):`, error);
      return false;
    }
  }

  /**
   * 清除用户相关缓存
   */
  static async clearUserCache(userId: string): Promise<void> {
    const patterns = [
      `${CacheKey.USER_FARM_STATE}${userId}`,
      `${CacheKey.USER_PROFILE}${userId}`,
      `${CacheKey.AGENT_INFO}*`, // 需要根据ownerId过滤
    ];

    for (const pattern of patterns) {
      await this.delete(pattern);
    }
  }

  /**
   * 清除配置缓存
   */
  static async clearConfigCache(): Promise<void> {
    await this.delete(CacheKey.CROP_CONFIGS);
    await this.delete(CacheKey.LEVEL_CONFIGS);
    await this.delete(CacheKey.GAME_CONFIGS);
    await this.deletePattern(`${CacheKey.CROP_CONFIG_BY_ID}*`);
    await this.deletePattern(`${CacheKey.LEVEL_CONFIG_BY_ID}*`);
  }
}

/**
 * 缓存装饰器工厂
 * 用于缓存函数结果
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyBuilder: (...args: Parameters<T>) => string,
  options?: CacheOptions
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
      const key = keyBuilder(...args);
      
      return CacheService.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        options
      ) as Promise<ReturnType<T>>;
    } as T;

    return descriptor;
  };
}

