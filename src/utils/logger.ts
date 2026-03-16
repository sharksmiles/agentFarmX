/**
 * 统一日志服务
 * 提供结构化日志记录，支持不同日志级别和环境配置
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  duration?: number;
}

/**
 * 日志配置
 */
const LOG_CONFIG = {
  // 根据环境设置最小日志级别
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // 是否输出JSON格式（生产环境）
  jsonFormat: process.env.NODE_ENV === 'production',
  // 是否包含时间戳
  includeTimestamp: true,
};

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 格式化日志输出
 */
function formatLog(entry: LogEntry): string {
  if (LOG_CONFIG.jsonFormat) {
    return JSON.stringify(entry);
  }

  // 开发环境：彩色输出
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const color = levelColors[entry.level];

  const prefix = `[${entry.timestamp}] ${color}${entry.level.toUpperCase().padEnd(5)}${reset}`;
  let message = `${prefix} ${entry.message}`;

  if (entry.requestId) {
    message += ` [req:${entry.requestId}]`;
  }
  if (entry.userId) {
    message += ` [user:${entry.userId}]`;
  }
  if (entry.duration !== undefined) {
    message += ` (${entry.duration}ms)`;
  }
  if (entry.context && Object.keys(entry.context).length > 0) {
    message += ` ${JSON.stringify(entry.context)}`;
  }

  return message;
}

/**
 * 检查是否应该输出日志
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_CONFIG.minLevel];
}

/**
 * 创建日志条目
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  meta?: { requestId?: string; userId?: string; duration?: number }
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    requestId: meta?.requestId,
    userId: meta?.userId,
    duration: meta?.duration,
  };
}

/**
 * Logger类
 */
export class Logger {
  private context: LogContext = {};
  private requestId?: string;
  private userId?: string;

  constructor(context?: LogContext) {
    if (context) {
      this.context = context;
    }
  }

  /**
   * 设置请求ID
   */
  setRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  /**
   * 添加上下文
   */
  addContext(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, { ...this.context, ...context }, {
      requestId: this.requestId,
      userId: this.userId,
    });
    console.debug(formatLog(entry));
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, { ...this.context, ...context }, {
      requestId: this.requestId,
      userId: this.userId,
    });
    console.info(formatLog(entry));
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, { ...this.context, ...context }, {
      requestId: this.requestId,
      userId: this.userId,
    });
    console.warn(formatLog(entry));
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;
    const errorContext: LogContext = { ...this.context, ...context };
    
    if (error instanceof Error) {
      errorContext.errorName = error.name;
      errorContext.errorMessage = error.message;
      errorContext.stack = error.stack;
    } else if (error) {
      errorContext.error = error;
    }

    const entry = createLogEntry('error', message, errorContext, {
      requestId: this.requestId,
      userId: this.userId,
    });
    console.error(formatLog(entry));
  }

  /**
   * 记录API请求
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    if (!shouldLog(level)) return;

    const entry = createLogEntry(
      level,
      `API ${method} ${path} - ${statusCode}`,
      { method, path, statusCode, ...this.context, ...context },
      { requestId: this.requestId, userId: this.userId, duration }
    );
    
    if (level === 'error') {
      console.error(formatLog(entry));
    } else if (level === 'warn') {
      console.warn(formatLog(entry));
    } else {
      console.info(formatLog(entry));
    }
  }

  /**
   * 创建子Logger
   */
  child(context?: LogContext): Logger {
    const childLogger = new Logger({ ...this.context, ...context });
    if (this.requestId) childLogger.setRequestId(this.requestId);
    if (this.userId) childLogger.setUserId(this.userId);
    return childLogger;
  }

  /**
   * 计时器
   */
  time(label: string): { end: (context?: LogContext) => void } {
    const start = Date.now();
    return {
      end: (context?: LogContext) => {
        const duration = Date.now() - start;
        this.debug(`${label} completed`, { duration, ...context });
      },
    };
  }
}

/**
 * 默认Logger实例
 */
export const logger = new Logger();

/**
 * 创建带模块上下文的Logger
 */
export function createLogger(module: string, context?: LogContext): Logger {
  return new Logger({ module, ...context });
}

/**
 * API请求日志中间件辅助函数
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string,
  requestId?: string
): void {
  const log = new Logger({ module: 'API' });
  if (userId) log.setUserId(userId);
  if (requestId) log.setRequestId(requestId);
  log.apiRequest(method, path, statusCode, duration);
}
