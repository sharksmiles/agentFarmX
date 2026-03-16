import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const currentUserId = searchParams.get('userId');

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

    // Get friendship status for each user if currentUserId is provided
    let friendshipMap = new Map<string, { isFriend: boolean; hasPendingRequest: boolean }>();
    
    if (currentUserId) {
      const userIds = users.map(u => u.id).filter(id => id !== currentUserId);
      
      // Check all existing friend relationships
      const existingRelations = await prisma.socialAction.findMany({
        where: {
          OR: [
            { fromUserId: currentUserId, toUserId: { in: userIds }, actionType: 'friend' },
            { fromUserId: { in: userIds }, toUserId: currentUserId, actionType: 'friend' },
          ],
        },
      });

      // Build friendship map
      userIds.forEach(userId => {
        const relation = existingRelations.find(
          r => (r.fromUserId === currentUserId && r.toUserId === userId) ||
               (r.fromUserId === userId && r.toUserId === currentUserId)
        );
        
        if (relation) {
          const metadata = relation.metadata as any;
          const isAccepted = metadata?.status === 'accepted';
          const isPending = metadata?.status === 'pending';
          
          friendshipMap.set(userId, {
            isFriend: isAccepted,
            hasPendingRequest: isPending,
          });
        } else {
          friendshipMap.set(userId, { isFriend: false, hasPendingRequest: false });
        }
      });
    }

    // Map to frontend expected format
    const formattedUsers = users
      .filter(user => user.id !== currentUserId) // Exclude current user from results
      .map(user => {
        const plots = user.farmState?.landPlots || [];
        const needWater = plots.filter(p => p.nextWateringDue && p.nextWateringDue < new Date() && p.cropId && p.growthStage < 4).length;
        const needHarvest = plots.filter(p => p.growthStage === 4).length;
        const friendship = friendshipMap.get(user.id) || { isFriend: false, hasPendingRequest: false };

        return {
          id: user.id,
          user_name: user.username || `X Layer-${user.walletAddress.slice(-4)}`,
          user_game_level: user.level,
          user_coin_balance: user.farmCoins,
          need_water: needWater,
          need_harvest: needHarvest,
          last_login: user.lastLoginAt.toISOString(),
          is_friend: friendship.isFriend,
          has_pending_request: friendship.hasPendingRequest,
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
