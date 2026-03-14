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

    const farmState = await prisma.farmState.findUnique({
      where: { userId },
      include: {
        landPlots: {
          orderBy: { plotIndex: 'asc' },
        },
        user: {
          select: {
            level: true,
            experience: true,
            farmCoins: true,
          },
        },
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ farmState });
  } catch (error) {
    console.error('GET /api/farm/state error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
