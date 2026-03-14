import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { friendId: string } }
) {
  try {
    const farmState = await prisma.farmState.findUnique({
      where: { userId: params.friendId },
      include: {
        landPlots: {
          orderBy: { plotIndex: 'asc' },
        },
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Friend farm not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ farmState });
  } catch (error) {
    console.error('GET /api/social/[friendId]/farm error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
