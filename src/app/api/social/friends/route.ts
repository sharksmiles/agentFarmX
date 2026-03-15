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
            farmCoins: true,
            farmState: {
              include: {
                landPlots: {
                  where: {
                    isUnlocked: true,
                    cropId: { not: null },
                  },
                },
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            walletAddress: true,
            username: true,
            avatar: true,
            level: true,
            farmCoins: true,
            farmState: {
              include: {
                landPlots: {
                  where: {
                    isUnlocked: true,
                    cropId: { not: null },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Extract unique friends and calculate status
    const now = new Date();
    const friendsSet = new Set<string>();
    const friendsMap = new Map();

    friendActions.forEach((action) => {
      const friendId = action.fromUserId === userId ? action.toUserId : action.fromUserId;
      const friendData = action.fromUserId === userId ? action.toUser : action.fromUser;
      
      if (!friendsSet.has(friendId)) {
        friendsSet.add(friendId);
        
        // Calculate status indicators
        let needWaterCount = 0;
        let needHarvestCount = 0;

        if (friendData.farmState?.landPlots) {
          friendData.farmState.landPlots.forEach((plot: any) => {
            // Check if needs water (nextWateringDue <= now AND not mature)
            if (plot.cropId && 
                plot.nextWateringDue && 
                new Date(plot.nextWateringDue) <= now && 
                plot.growthStage < 4) {
              needWaterCount++;
            }
            // Check if ready to harvest (growthStage is 4 OR harvestAt <= now)
            if (plot.cropId && 
                (plot.growthStage === 4 || (plot.harvestAt && new Date(plot.harvestAt) <= now))) {
              needHarvestCount++;
            }
          });
        }

        // Add to result
        friendsMap.set(friendId, {
          id: friendData.id,
          walletAddress: friendData.walletAddress,
          username: friendData.username,
          avatar: friendData.avatar,
          level: friendData.level,
          farmCoins: friendData.farmCoins,
          need_water: needWaterCount,
          need_harvest: needHarvestCount,
        });
      }
    });

    let friends = Array.from(friendsMap.values());

    // Apply filter if provided
    if (filter === 'need_water') {
      friends = friends.filter(f => f.need_water > 0);
    }

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
