/**
 * 环境变量验证模块
 * 使用Zod进行类型安全的环境变量验证
 */

import { z } from 'zod';

/**
 * 环境变量Schema定义
 */
const envSchema = z.object({
  // Node环境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // 数据库配置
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // JWT配置
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Redis配置（可选）
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // AI配置（可选）
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // 区块链配置
  NEXT_PUBLIC_CHAIN_ID: z.string().default('195'),
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
  
  // 应用配置
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('AgentFarm X'),
  
  // 日志级别
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * 公开环境变量Schema（可在客户端使用）
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.string(),
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string(),
});

/**
 * 验证结果类型
 */
export type Env = z.infer<typeof envSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * 验证环境变量
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    // 在开发环境中显示警告但继续运行
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Running with missing environment variables in development mode');
      // 返回默认值
      return envSchema.parse({
        NODE_ENV: 'development',
        DATABASE_URL: process.env.DATABASE_URL || '',
        JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-min-32-characters-long',
        JWT_EXPIRES_IN: '7d',
        JWT_REFRESH_EXPIRES_IN: '30d',
        NEXT_PUBLIC_CHAIN_ID: '195',
        NEXT_PUBLIC_APP_NAME: 'AgentFarm X',
        LOG_LEVEL: 'debug',
      });
    }
    
    throw new Error('Invalid environment variables');
  }
  
  return result.data;
}

/**
 * 验证公开环境变量（用于客户端）
 */
export function validatePublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });
  
  if (!result.success) {
    console.error('❌ Invalid public environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    // 返回默认值
    return publicEnvSchema.parse({
      NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '195',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AgentFarm X',
    });
  }
  
  return result.data;
}

/**
 * 缓存验证结果
 */
let cachedEnv: Env | null = null;

/**
 * 获取验证后的环境变量
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * 检查必需的环境变量是否存在
 */
export function checkRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  
  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 检查可选功能的环境变量
 */
export function checkOptionalFeatures(): Record<string, boolean> {
  return {
    redis: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    blockchain: !!process.env.NEXT_PUBLIC_RPC_URL,
  };
}

/**
 * 打印环境配置摘要（仅在启动时）
 */
export function printEnvSummary(): void {
  if (process.env.NODE_ENV === 'test') return;
  
  const env = getEnv();
  const features = checkOptionalFeatures();
  
  console.log('\n📋 Environment Configuration:');
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  LOG_LEVEL: ${env.LOG_LEVEL}`);
  console.log(`  CHAIN_ID: ${env.NEXT_PUBLIC_CHAIN_ID}`);
  console.log('\n🔧 Optional Features:');
  Object.entries(features).forEach(([name, enabled]) => {
    const icon = enabled ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
  });
  console.log('');
}

// 在模块加载时验证
if (typeof window === 'undefined') {
  // 仅在服务端验证
  try {
    getEnv();
  } catch (error) {
    console.error('Failed to validate environment variables:', error);
  }
}

// 导出便捷访问器
export const env = new Proxy({} as Env, {
  get: (_, key: string) => getEnv()[key as keyof Env],
});
