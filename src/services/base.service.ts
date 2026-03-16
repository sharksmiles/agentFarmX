import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

/**
 * 事务选项接口
 */
export interface TransactionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * 基础服务类
 * 提供通用的数据库操作方法
 */
export abstract class BaseService {
  protected prisma = prisma;

  /**
   * 执行事务，支持自动重试
   */
  protected async withTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      timeout = 15000,
      maxRetries = 3,
      retryDelay = 100
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(fn, { timeout });
      } catch (error: any) {
        lastError = error;
        
        // 检查是否是可重试的错误（如死锁、连接超时等）
        const isRetryable = 
          error.code === 'P2034' || // 死锁
          error.code === 'P2024' || // 连接超时
          error.message?.includes('Transaction failed') ||
          error.message?.includes('Connection');

        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }

        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }

    throw lastError;
  }

  /**
   * 获取系统配置
   */
  protected async getConfig<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key },
      });
      return config?.value as T ?? defaultValue;
    } catch (error) {
      console.error(`[BaseService] Error fetching config for ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置系统配置
   */
  protected async setConfig(key: string, value: any, description?: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, description },
      update: { value },
    });
  }

  /**
   * 记录操作日志
   */
  protected async log(
    level: 'info' | 'warning' | 'error',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry = {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };
    
    // 在开发环境打印日志
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(logEntry));
    }
    
    // TODO: 集成日志服务（如Sentry、LogRocket等）
  }

  /**
   * 分页查询辅助方法
   */
  protected getPaginationParams(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    return { skip, take };
  }

  /**
   * 构建分页响应
   */
  protected buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ) {
    return {
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    };
  }
}

/**
 * 服务错误类
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  static notFound(resource: string, id?: string) {
    return new ServiceError(
      `${resource} not found${id ? `: ${id}` : ''}`,
      'NOT_FOUND',
      404
    );
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ServiceError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = 'Access denied') {
    return new ServiceError(message, 'FORBIDDEN', 403);
  }

  static badRequest(message: string, details?: Record<string, any>) {
    return new ServiceError(message, 'BAD_REQUEST', 400, details);
  }

  static conflict(message: string) {
    return new ServiceError(message, 'CONFLICT', 409);
  }
}
