import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'coins'; // 'coins' | 'level' | 'experience'
    const limit = parseInt(searchParams.get('limit') || '50');

    let orderBy: any = { farmCoins: 'desc' };

    if (type === 'level') {
      orderBy = { level: 'desc' };
    } else if (type === 'experience') {
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

    return NextResponse.json({ leaderboard, type });
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
