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

    // Build the query where clause - include both incoming and outgoing actions
    const where: any = {
      OR: [
        { toUserId: userId },   // 别人对我的操作
        { fromUserId: userId }, // 我对别人的操作
      ],
    };

    if (filter === 'watered') {
      where.OR = where.OR.map((cond: any) => ({ ...cond, actionType: 'water' }));
    } else if (filter === 'stole') {
      where.OR = where.OR.map((cond: any) => ({
        ...cond,
        actionType: 'steal',
        metadata: { path: ['success'], equals: true },
      }));
    } else if (filter === 'failed stealing') {
      where.OR = where.OR.map((cond: any) => ({
        ...cond,
        actionType: 'steal',
        metadata: { path: ['success'], equals: false },
      }));
    } else {
      // Add actionType filter to both conditions
      where.OR = where.OR.map((cond: any) => ({
        ...cond,
        actionType: { in: ['water', 'steal'] },
      }));
    }

    // Get social actions - both incoming (others to me) and outgoing (me to others)
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
        toUser: {
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
      const isIncoming = action.toUserId === userId; // 别人对我 = true, 我对别人 = false
      
      // 根据方向确定显示的用户
      const targetUser = isIncoming ? action.fromUser : action.toUser;
      
      let displayAction = action.actionType;
      let actionDirection = '';
      
      if (action.actionType === 'water') {
        if (isIncoming) {
          displayAction = 'watered';
          actionDirection = 'your'; // 别人浇了我的
        } else {
          displayAction = 'watered';
          actionDirection = 'their'; // 我浇了别人的
        }
      } else if (action.actionType === 'steal') {
        if (isIncoming) {
          displayAction = metadata.success ? 'stole' : 'failed stealing';
          actionDirection = 'your'; // 别人偷了我的
        } else {
          displayAction = metadata.success ? 'stole' : 'failed stealing';
          actionDirection = 'their'; // 我偷了别人的
        }
      }

      return {
        id: action.id,
        user_id: targetUser.id,
        user_name: targetUser.username || 'Unknown',
        user_game_level: targetUser.level,
        user_coin_balance: targetUser.farmCoins,
        action: displayAction,
        action_direction: actionDirection, // 'your' 或 'their'
        is_incoming: isIncoming, // true = 别人对我, false = 我对别人
        user_earning: metadata.reward || 0,
        user_exp_gain: 0,
        crop_name: metadata.cropId || 'Wheat',
        action_time: action.createdAt.toISOString(),
        last_login: targetUser.lastLoginAt.toISOString(),
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
