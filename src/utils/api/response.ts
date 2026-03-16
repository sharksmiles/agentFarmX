import { NextResponse } from 'next/server';

/**
 * 标准化 API 成功响应
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 标准化 API 错误响应
 */
export function errorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 404 错误响应
 */
export function notFoundResponse(message: string = 'Resource not found') {
  return errorResponse(message, 404);
}

/**
 * 500 错误响应
 */
export function internalErrorResponse(error: any) {
  console.error('[API Error]:', error);
  return errorResponse('Internal server error', 500, process.env.NODE_ENV === 'development' ? error.message : undefined);
}
