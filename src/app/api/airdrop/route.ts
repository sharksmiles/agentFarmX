import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

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
      airdrops: airdropsWithStatus,
      totalAirdrops: airdrops.length,
      claimedCount: claimedIds.length,
    });
  } catch (error) {
    console.error('GET /api/airdrop error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
