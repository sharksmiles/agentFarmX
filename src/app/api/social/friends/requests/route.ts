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

    // Get pending friend requests
    const requests = await prisma.socialAction.findMany({
      where: {
        toUserId: userId,
        actionType: 'friend',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter pending requests
    const pendingRequests = requests.filter((req) => {
      const metadata = req.metadata as any;
      return metadata?.status === 'pending';
    });

    return NextResponse.json({ 
      requests: pendingRequests,
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error('GET /api/social/friends/requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
