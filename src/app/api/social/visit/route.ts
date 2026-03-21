import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import { paymentRequiredResponse, hasValidPaymentHeader } from '@/utils/api/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Raider Skill 价格
const VISIT_SKILL_PRICE = 0.001; // USDC

/**
 * POST /api/social/visit - 访问好友农场
 * 需要认证：验证用户身份
 * 需要 x402 支付：Raider Skill 付费
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { friendId, mode } = body;

    // x402 支付检查 - Raider Skill 付费
    // 仅机器人执行时需要支付，手动访问(mode=manual)跳过支付
    if (mode !== 'manual' && !context.auth.isInternal && !hasValidPaymentHeader(request)) {
      return paymentRequiredResponse(
        'visit_friend',
        VISIT_SKILL_PRICE,
        '/api/social/visit',
        'Visit friend farm - Raider Bot Skill'
      );
    }
    const userId = context.auth.userId;

    if (!friendId) {
      return NextResponse.json(
        { success: false, error: 'friendId is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // 验证不能访问自己
    if (friendId === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot visit yourself', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // 验证好友是否存在
    const friendExists = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true },
    });

    if (!friendExists) {
      return NextResponse.json(
        { success: false, error: 'Friend not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Record visit
    const visit = await prisma.socialAction.create({
      data: {
        fromUserId: userId,
        toUserId: friendId,
        actionType: 'visit',
        metadata: {
          visitedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true, data: { visit } });
  } catch (error) {
    console.error('POST /api/social/visit error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
