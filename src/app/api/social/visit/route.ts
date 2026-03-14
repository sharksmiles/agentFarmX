import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId } = body;

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: 'userId and friendId are required' },
        { status: 400 }
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

    return NextResponse.json({ visit });
  } catch (error) {
    console.error('POST /api/social/visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
