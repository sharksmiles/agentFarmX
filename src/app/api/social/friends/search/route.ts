import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Search users by username or wallet address
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { walletAddress: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        farmState: {
          include: {
            landPlots: {
              where: {
                OR: [
                  { growthStage: 4 }, // Mature
                  { nextWateringDue: { lt: new Date() }, cropId: { not: null }, growthStage: { lt: 4 } } // Needs water
                ]
              }
            }
          }
        }
      },
      take: 20,
    });

    // Map to frontend expected format
    const formattedUsers = users.map(user => {
      const plots = user.farmState?.landPlots || [];
      const needWater = plots.filter(p => p.nextWateringDue && p.nextWateringDue < new Date() && p.cropId && p.growthStage < 4).length;
      const needHarvest = plots.filter(p => p.growthStage === 4).length;

      return {
        id: user.id,
        user_name: user.username || `X Layer-${user.walletAddress.slice(-4)}`,
        user_game_level: user.level,
        user_coin_balance: user.farmCoins,
        need_water: needWater,
        need_harvest: needHarvest,
        last_login: user.lastLoginAt.toISOString(),
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('GET /api/social/friends/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
