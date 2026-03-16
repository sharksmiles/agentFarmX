import { NextRequest } from 'next/server';
import { AuthService } from '@/services/authService';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';

/**
 * POST /api/auth/refresh
 * 刷新访问Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return errorResponse('Refresh token is required', 400);
    }

    const tokens = await AuthService.refreshToken(refreshToken);

    if (!tokens) {
      return errorResponse('Invalid or expired refresh token', 401);
    }

    return successResponse({ tokens });
  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    return internalErrorResponse(error);
  }
}
