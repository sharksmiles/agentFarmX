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
          { walletAddress: { contains: query.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        avatar: true,
        level: true,
      },
      take: 20,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/social/friends/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
