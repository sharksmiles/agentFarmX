import { NextRequest } from 'next/server';
import { SiweMessage } from 'siwe';
import { AuthService } from '@/services/authService';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';

/**
 * POST /api/auth/login
 * 用户登录/注册接口
 * 通过SIWE签名验证用户身份，返回JWT Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return errorResponse('Message and signature are required', 400);
    }

    // 验证 SIWE 签名
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return errorResponse('Invalid signature', 401);
    }

    const walletAddress = siweMessage.address;

    // 使用认证服务处理登录
    const loginResult = await AuthService.login(walletAddress);

    return successResponse({
      user: mapUserToFrontend(loginResult.user),
      tokens: loginResult.tokens,
      isNewUser: loginResult.isNewUser,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return internalErrorResponse(error);
  }
}
