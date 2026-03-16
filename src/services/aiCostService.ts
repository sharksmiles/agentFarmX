/**
 * AI成本控制服务
 * 追踪和管理AI token使用量
 */

import { prisma } from '@/lib/prisma';
import { CacheService, CacheTTL } from '@/lib/cache';

/**
 * Token使用记录接口
 */
export interface TokenUsageRecord {
  userId: string;
  agentId: string;
  provider: string;  // openai, anthropic, google
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestType: string;  // decision, chat, skill
  cost: number;  // 美元
}

/**
 * 用户配额接口
 */
export interface UserQuota {
  dailyLimit: number;
  dailyUsed: number;
  monthlyLimit: number;
  monthlyUsed: number;
  lastReset: Date;
}

/**
 * 模型定价配置（美元/1K tokens）
 */
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  // OpenAI
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  
  // Anthropic
  'claude-3-opus': { prompt: 0.015, completion: 0.075 },
  'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
  'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
  
  // Google
  'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
  'gemini-1.5-pro': { prompt: 0.0035, completion: 0.0105 },
};

/**
 * 默认配额限制
 */
const DEFAULT_QUOTA = {
  dailyLimit: 100000,    // 100K tokens/天
  monthlyLimit: 2000000, // 2M tokens/月
};

/**
 * AI成本控制服务
 */
export class AICostService {
  /**
   * 计算token成本
   */
  static calculateCost(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-3.5-turbo'];
    
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    
    return Number((promptCost + completionCost).toFixed(6));
  }

  /**
   * 获取用户配额
   */
  static async getUserQuota(userId: string): Promise<UserQuota> {
    const cacheKey = `user_quota:${userId}`;
    
    const cached = await CacheService.get<UserQuota>(cacheKey);
    if (cached) {
      // 检查是否需要重置
      const now = new Date();
      const lastReset = new Date(cached.lastReset);
      
      // 检查日重置
      if (now.getDate() !== lastReset.getDate() || 
          now.getMonth() !== lastReset.getMonth()) {
        return this.resetUserQuota(userId);
      }
      
      return cached;
    }

    // 从数据库获取或创建
    return this.fetchOrCreateQuota(userId);
  }

  /**
   * 从数据库获取或创建配额
   */
  private static async fetchOrCreateQuota(userId: string): Promise<UserQuota> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: `ai_quota:${userId}` },
      });

      if (config) {
        return config.value as unknown as UserQuota;
      }

      // 创建新配额
      const newQuota: UserQuota = {
        dailyLimit: DEFAULT_QUOTA.dailyLimit,
        dailyUsed: 0,
        monthlyLimit: DEFAULT_QUOTA.monthlyLimit,
        monthlyUsed: 0,
        lastReset: new Date(),
      };

      await prisma.systemConfig.create({
        data: {
          key: `ai_quota:${userId}`,
          value: newQuota as any,
          description: `AI token quota for user ${userId}`,
        },
      });

      return newQuota;
    } catch (error) {
      console.error('[AICostService] Error fetching quota:', error);
      return {
        ...DEFAULT_QUOTA,
        dailyUsed: 0,
        monthlyUsed: 0,
        lastReset: new Date(),
      };
    }
  }

  /**
   * 重置用户配额
   */
  private static async resetUserQuota(userId: string): Promise<UserQuota> {
    const newQuota: UserQuota = {
      dailyLimit: DEFAULT_QUOTA.dailyLimit,
      dailyUsed: 0,
      monthlyLimit: DEFAULT_QUOTA.monthlyLimit,
      monthlyUsed: 0,
      lastReset: new Date(),
    };

    await this.saveUserQuota(userId, newQuota);
    return newQuota;
  }

  /**
   * 保存用户配额
   */
  private static async saveUserQuota(userId: string, quota: UserQuota): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key: `ai_quota:${userId}` },
      create: {
        key: `ai_quota:${userId}`,
        value: quota as any,
        description: `AI token quota for user ${userId}`,
      },
      update: { value: quota as any },
    });

    // 更新缓存
    await CacheService.set(`user_quota:${userId}`, quota, { ttl: CacheTTL.MEDIUM });
  }

  /**
   * 检查用户是否有足够的配额
   */
  static async checkQuota(userId: string, estimatedTokens: number): Promise<{
    allowed: boolean;
    reason?: string;
    remaining: number;
  }> {
    const quota = await this.getUserQuota(userId);

    // 检查日限制
    const dailyRemaining = quota.dailyLimit - quota.dailyUsed;
    if (dailyRemaining < estimatedTokens) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded. Remaining: ${dailyRemaining}`,
        remaining: dailyRemaining,
      };
    }

    // 检查月限制
    const monthlyRemaining = quota.monthlyLimit - quota.monthlyUsed;
    if (monthlyRemaining < estimatedTokens) {
      return {
        allowed: false,
        reason: `Monthly token limit exceeded. Remaining: ${monthlyRemaining}`,
        remaining: monthlyRemaining,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(dailyRemaining, monthlyRemaining),
    };
  }

  /**
   * 记录token使用
   */
  static async recordUsage(record: TokenUsageRecord): Promise<void> {
    try {
      // 1. 更新用户配额
      const quota = await this.getUserQuota(record.userId);
      quota.dailyUsed += record.totalTokens;
      quota.monthlyUsed += record.totalTokens;
      await this.saveUserQuota(record.userId, quota);

      // 2. 记录详细使用日志（可选，用于分析）
      await this.logUsage(record);

      console.log(
        `[AICostService] Token usage recorded: ${record.totalTokens} tokens, $${record.cost.toFixed(6)}`
      );
    } catch (error) {
      console.error('[AICostService] Error recording usage:', error);
    }
  }

  /**
   * 记录使用日志
   */
  private static async logUsage(record: TokenUsageRecord): Promise<void> {
    const logKey = `ai_usage_log:${record.userId}:${Date.now()}`;
    await CacheService.set(logKey, record, { ttl: CacheTTL.LONG });
  }

  /**
   * 获取用户使用统计
   */
  static async getUsageStats(userId: string, period: 'day' | 'month' = 'day'): Promise<{
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { tokens: number; cost: number }>;
    byType: Record<string, { tokens: number; cost: number }>;
  }> {
    const quota = await this.getUserQuota(userId);
    
    // 简化实现：返回配额信息
    // 实际实现可以从日志聚合详细统计
    return {
      totalTokens: period === 'day' ? quota.dailyUsed : quota.monthlyUsed,
      totalCost: 0, // 需要从日志计算
      byModel: {},
      byType: {},
    };
  }

  /**
   * 设置用户配额限制
   */
  static async setUserQuotaLimits(
    userId: string,
    limits: { dailyLimit?: number; monthlyLimit?: number }
  ): Promise<void> {
    const quota = await this.getUserQuota(userId);
    
    if (limits.dailyLimit !== undefined) {
      quota.dailyLimit = limits.dailyLimit;
    }
    if (limits.monthlyLimit !== undefined) {
      quota.monthlyLimit = limits.monthlyLimit;
    }

    await this.saveUserQuota(userId, quota);
  }

  /**
   * 创建带成本追踪的AI请求包装器
   */
  static wrapAIRequest<T>(
    userId: string,
    agentId: string,
    provider: string,
    model: string,
    requestType: string
  ) {
    return {
      beforeRequest: async (estimatedTokens: number) => {
        const check = await this.checkQuota(userId, estimatedTokens);
        if (!check.allowed) {
          throw new Error(check.reason || 'Token quota exceeded');
        }
        return check;
      },
      
      afterResponse: async (
        response: T & { usage?: { promptTokens: number; completionTokens: number } }
      ) => {
        if (response.usage) {
          const cost = this.calculateCost(
            provider,
            model,
            response.usage.promptTokens,
            response.usage.completionTokens
          );

          await this.recordUsage({
            userId,
            agentId,
            provider,
            model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.promptTokens + response.usage.completionTokens,
            requestType,
            cost,
          });
        }

        return response;
      },
    };
  }
}

/**
 * 装饰器：自动追踪AI调用成本
 */
export function trackAICost(
  provider: string,
  model: string,
  requestType: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: any[]) {
      // 假设第一个参数包含userId和agentId
      const { userId, agentId } = args[0] || {};

      if (!userId) {
        return originalMethod.apply(this, args);
      }

      const wrapper = AICostService.wrapAIRequest(
        userId,
        agentId || 'unknown',
        provider,
        model,
        requestType
      );

      // 估算token（简单估算）
      await wrapper.beforeRequest(1000);

      const result = await originalMethod.apply(this, args);

      await wrapper.afterResponse(result);

      return result;
    };

    return descriptor;
  };
}
