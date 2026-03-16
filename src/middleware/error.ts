import { NextRequest, NextResponse } from 'next/server';
import { ServiceError } from '@/services/base.service';
import { Prisma } from '@prisma/client';

/**
 * API错误接口
 */
export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * 错误处理中间件
 * 捕获并统一处理所有错误
 */
export function withErrorHandler(
  handler: (request: NextRequest, context: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * 统一错误处理函数
 */
export function handleError(error: unknown): NextResponse<ApiError> {
  // ServiceError
  if (error instanceof ServiceError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Prisma错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
        details: { prismaError: error.message },
      },
      { status: 400 }
    );
  }

  // 标准Error
  if (error instanceof Error) {
    // 检查是否是常见业务错误
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (message.includes('insufficient') || message.includes('not enough')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'INSUFFICIENT_RESOURCES',
        },
        { status: 400 }
      );
    }

    if (message.includes('already') || message.includes('duplicate')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'CONFLICT',
        },
        { status: 409 }
      );
    }

    if (message.includes('unauthorized') || message.includes('invalid token')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    if (message.includes('forbidden') || message.includes('access denied')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // 默认服务器错误
    console.error('[ErrorHandler] Unhandled error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }

  // 未知错误类型
  console.error('[ErrorHandler] Unknown error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}

/**
 * 处理Prisma特定错误
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse<ApiError> {
  switch (error.code) {
    case 'P2002':
      // 唯一约束违反
      const target = (error.meta?.target as string[]) || ['field'];
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate value for ${target.join(', ')}`,
          code: 'DUPLICATE_ENTRY',
        },
        { status: 409 }
      );

    case 'P2025':
      // 记录不存在
      return NextResponse.json(
        {
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );

    case 'P2003':
      // 外键约束违反
      return NextResponse.json(
        {
          success: false,
          error: 'Referenced record does not exist',
          code: 'FOREIGN_KEY_ERROR',
        },
        { status: 400 }
      );

    case 'P2014':
      // 关系违反
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid relation',
          code: 'RELATION_ERROR',
        },
        { status: 400 }
      );

    case 'P2021':
      // 表不存在
      return NextResponse.json(
        {
          success: false,
          error: 'Database table does not exist',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );

    case 'P2024':
      // 连接超时
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection timeout',
          code: 'CONNECTION_TIMEOUT',
        },
        { status: 503 }
      );

    default:
      console.error('[ErrorHandler] Prisma error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Database operation failed',
          code: 'DATABASE_ERROR',
          details: { code: error.code },
        },
        { status: 500 }
      );
  }
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * 创建分页响应
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    },
  });
}
