import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');

    let orderBy: any = { farmCoins: 'desc' };

    if (params.type === 'level') {
      orderBy = { level: 'desc' };
    } else if (params.type === 'experience') {
      orderBy = { experience: 'desc' };
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        walletAddress: true,
        username: true,
        avatar: true,
        level: true,
        experience: true,
        farmCoins: true,
      },
      orderBy,
      take: limit,
    });

    // Add rank
    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    // Find user's rank if userId provided
    let userRank = null;
    if (userId) {
      const userIndex = leaderboard.findIndex((u) => u.id === userId);
      if (userIndex !== -1) {
        userRank = leaderboard[userIndex];
      }
    }

    return NextResponse.json({ 
      leaderboard, 
      type: params.type,
      userRank,
    });
  } catch (error) {
    console.error('GET /api/leaderboard/[type] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
