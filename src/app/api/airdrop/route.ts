import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * GET /api/airdrop - 获取空投列表
 * 需要认证：验证用户身份，查看空投状态
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;

    // Get active airdrops from SystemConfig
    const airdropConfig = await prisma.systemConfig.findUnique({
      where: { key: 'active_airdrops' },
    });

    const airdrops = (airdropConfig?.value as any)?.airdrops || [
      {
        id: 'airdrop_1',
        name: 'Welcome Airdrop',
        description: 'Claim your welcome bonus!',
        amount: '100',
        token: 'FARM',
        eligibility: 'new_user',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
      },
    ];

    // Check which airdrops user has claimed
    const claimedAirdrops = await prisma.socialAction.findMany({
      where: {
        fromUserId: userId,
        actionType: 'airdrop_claim',
      },
    });

    const claimedIds = claimedAirdrops.map((a) => (a.metadata as any)?.airdropId);

    const airdropsWithStatus = airdrops.map((airdrop: any) => ({
      ...airdrop,
      claimed: claimedIds.includes(airdrop.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        airdrops: airdropsWithStatus,
        totalAirdrops: airdrops.length,
        claimedCount: claimedIds.length,
      },
    });
  } catch (error) {
    console.error('GET /api/airdrop error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
