import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * GET /api/invite/code - 获取用户邀请码
 * 需要认证：验证用户身份，只能查看自己的邀请码
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;

    // Get or create invite code
    const inviteConfig = await prisma.systemConfig.findUnique({
      where: { key: `invite_code_${userId}` },
    });

    let inviteCode = (inviteConfig?.value as any)?.code;

    if (!inviteCode) {
      inviteCode = `INV${userId.substring(0, 8).toUpperCase()}`;
      await prisma.systemConfig.create({
        data: {
          key: `invite_code_${userId}`,
          value: { code: inviteCode },
        },
      });
    }

    return NextResponse.json({ success: true, data: { inviteCode } });
  } catch (error) {
    console.error('GET /api/invite/code error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
