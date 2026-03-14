import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/social/friends - Get friends list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter'); // 'all' | 'need_water'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user's friends through social actions
    const friendActions = await prisma.socialAction.findMany({
      where: {
        OR: [
          { fromUserId: userId, actionType: 'friend' },
          { toUserId: userId, actionType: 'friend' },
        ],
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
        toUser: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
            avatar: true,
            level: true,
          },
        },
      },
    });

    // Extract unique friends
    const friendsSet = new Set<string>();
    const friendsMap = new Map();

    friendActions.forEach((action) => {
      const friendId = action.fromUserId === userId ? action.toUserId : action.fromUserId;
      const friend = action.fromUserId === userId ? action.toUser : action.fromUser;
      
      if (!friendsSet.has(friendId)) {
        friendsSet.add(friendId);
        friendsMap.set(friendId, friend);
      }
    });

    const friends = Array.from(friendsMap.values());

    return NextResponse.json({ 
      friends,
      total: friends.length,
    });
  } catch (error) {
    console.error('GET /api/social/friends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/social/friends - Send friend request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromUserId, toUserId } = body;

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { error: 'fromUserId and toUserId are required' },
        { status: 400 }
      );
    }

    // Check if already friends
    const existing = await prisma.socialAction.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId, actionType: 'friend' },
          { fromUserId: toUserId, toUserId: fromUserId, actionType: 'friend' },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already friends' },
        { status: 400 }
      );
    }

    // Create friend relationship
    const friendship = await prisma.socialAction.create({
      data: {
        fromUserId,
        toUserId,
        actionType: 'friend',
        metadata: {
          status: 'pending',
          requestedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ friendship });
  } catch (error) {
    console.error('POST /api/social/friends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
