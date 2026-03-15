import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const filter = searchParams.get('filter');
    const cursor = searchParams.get('cursor');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build the query where clause
    const where: any = {
      toUserId: userId,
    };

    if (filter === 'watered') {
      where.actionType = 'water';
    } else if (filter === 'stole') {
      where.actionType = 'steal';
      where.metadata = { path: ['success'], equals: true };
    } else if (filter === 'failed stealing') {
      where.actionType = 'steal';
      where.metadata = { path: ['success'], equals: false };
    } else {
      where.actionType = { in: ['water', 'steal'] };
    }

    // Get social actions where the target is the current user
    // This shows what other people did to the user's farm
    const socialActions = await prisma.socialAction.findMany({
      where,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            level: true,
            farmCoins: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const results = socialActions.map((action: any) => {
      const metadata = action.metadata as any || {};
      let displayAction = action.actionType;
      
      if (action.actionType === 'water') {
        displayAction = 'watered';
      } else if (action.actionType === 'steal') {
        displayAction = metadata.success ? 'stole' : 'failed stealing';
      }

      return {
        id: action.id,
        user_id: action.fromUserId,
        user_name: action.fromUser.username || 'Unknown',
        user_game_level: action.fromUser.level,
        user_coin_balance: action.fromUser.farmCoins,
        action: displayAction,
        user_earning: metadata.reward || 0,
        user_exp_gain: 0, // Social actions don't seem to give exp in current implementation
        crop_name: metadata.cropId || 'Wheat', // Default to Wheat if missing
        action_time: action.createdAt.toISOString(),
        last_login: action.fromUser.lastLoginAt.toISOString(),
      };
    });

    const next = results.length === 20 ? results[results.length - 1].id : null;

    return NextResponse.json({
      results,
      next,
    });
  } catch (error) {
    console.error('GET /api/social/record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
