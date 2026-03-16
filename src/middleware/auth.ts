import { NextRequest, NextResponse } from 'next/server';
import { JWTService, SessionPayload } from '@/lib/jwt';
import { AuthService } from '@/services/authService';

/**
 * 认证上下文 - 扩展请求对象
 */
export interface AuthContext {
  userId: string;
  walletAddress: string;
  session: SessionPayload;
}

/**
 * API Handler 类型 - 支持动态params类型
 */
export type AuthenticatedHandler<TParams extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: { params: TParams; auth: AuthContext }
) => Promise<NextResponse>;

/**
 * 认证错误响应
 */
function unauthorizedError(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED'
    },
    { status: 401 }
  );
}

/**
 * 认证中间件
 * 验证JWT Token并注入用户信息到请求上下文
 */
export function withAuth<TParams extends Record<string, string> = Record<string, string>>(
  handler: AuthenticatedHandler<TParams>
) {
  return async (
    request: NextRequest,
    context: { params: TParams }
  ): Promise<NextResponse> => {
    try {
      // 1. 从请求头提取Token
      const authHeader = request.headers.get('Authorization');
      const token = JWTService.extractTokenFromHeader(authHeader);

      if (!token) {
        return unauthorizedError('Missing authentication token');
      }

      // 2. 验证Token
      const session = await JWTService.verifyAccessToken(token);

      if (!session) {
        return unauthorizedError('Invalid or expired token');
      }

      // 3. 构建认证上下文
      const authContext: AuthContext = {
        userId: session.userId,
        walletAddress: session.walletAddress,
        session,
      };

      // 4. 调用实际的处理函数
      return handler(request, { ...context, auth: authContext });
    } catch (error) {
      console.error('[Auth Middleware] Error:', error);
      return unauthorizedError('Authentication failed');
    }
  };
}

/**
 * 可选认证中间件
 * 如果提供了Token则验证，否则继续执行（auth为null）
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    context: { params: Record<string, string>; auth: AuthContext | null }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = JWTService.extractTokenFromHeader(authHeader);

      let authContext: AuthContext | null = null;

      if (token) {
        const session = await JWTService.verifyAccessToken(token);
        if (session) {
          authContext = {
            userId: session.userId,
            walletAddress: session.walletAddress,
            session,
          };
        }
      }

      return handler(request, { ...context, auth: authContext });
    } catch (error) {
      console.error('[Auth Middleware] Error:', error);
      return handler(request, { ...context, auth: null });
    }
  };
}

/**
 * 验证资源所有权中间件
 * 确保用户只能访问自己的资源
 */
export function withOwnership(
  resourceType: 'farm' | 'agent' | 'inventory',
  getResourceId: (params: Record<string, string>) => string
) {
  return function (
    handler: (
      request: NextRequest,
      context: { params: Record<string, string>; auth: AuthContext }
    ) => Promise<NextResponse>
  ) {
    return withAuth(async (request, context) => {
      const resourceId = getResourceId(context.params);
      const hasOwnership = await AuthService.verifyOwnership(
        context.auth.userId,
        resourceType,
        resourceId
      );

      if (!hasOwnership) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: You do not own this resource',
            code: 'FORBIDDEN'
          },
          { status: 403 }
        );
      }

      return handler(request, context);
    });
  };
}

/**
 * 从请求中获取当前用户ID
 * 辅助函数，用于简化API中的用户身份获取
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  const token = JWTService.extractTokenFromHeader(authHeader);

  if (!token) return null;

  const session = await JWTService.verifyAccessToken(token);
  return session?.userId || null;
}

/**
 * 从请求中获取完整认证上下文
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  const token = JWTService.extractTokenFromHeader(authHeader);

  if (!token) return null;

  const session = await JWTService.verifyAccessToken(token);
  if (!session) return null;

  return {
    userId: session.userId,
    walletAddress: session.walletAddress,
    session,
  };
}
