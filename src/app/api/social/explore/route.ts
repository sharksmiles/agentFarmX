import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

const EXPLORE_COST = 100; // 每次探索消耗100金币

/**
 * POST /api/social/explore - 探索世界，寻找可偷窃的农场
 * 消耗100金币，返回一个随机好友的农场
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;

    // 在事务中执行
    const result = await prisma.$transaction(async (tx) => {
      // 1. 检查用户金币
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, farmCoins: true },
      });

      if (!user) throw new Error('User not found');
      if (user.farmCoins < EXPLORE_COST) {
        throw new Error('Not enough coins. Need 100 coins to explore.');
      }

      // 2. 扣除金币
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: EXPLORE_COST } },
      });

      // 3. 获取好友列表
      const friendActions = await tx.socialAction.findMany({
        where: {
          OR: [
            { fromUserId: userId, actionType: 'friend' },
            { toUserId: userId, actionType: 'friend' },
          ],
        },
        select: {
          fromUserId: true,
          toUserId: true,
        },
      });

      // 提取好友ID
      const friendIds = new Set<string>();
      friendActions.forEach((action) => {
        if (action.fromUserId !== userId) friendIds.add(action.fromUserId);
        if (action.toUserId !== userId) friendIds.add(action.toUserId);
      });

      if (friendIds.size === 0) {
        throw new Error('No friends found. Add some friends first!');
      }

      // 4. 随机选择一个好友
      const friendIdArray = Array.from(friendIds);
      const randomFriendId = friendIdArray[Math.floor(Math.random() * friendIdArray.length)];

      // 5. 获取好友信息
      const friend = await tx.user.findUnique({
        where: { id: randomFriendId },
        select: {
          id: true,
          username: true,
          avatar: true,
          level: true,
          farmState: {
            include: {
              landPlots: {
                where: { isUnlocked: true },
              },
            },
          },
        },
      });

      if (!friend) {
        throw new Error('Friend not found');
      }

      // 6. 计算可偷窃的作物数量（成熟超过15分钟的）
      const now = new Date();
      let stealableCrops = 0;
      
      if (friend.farmState?.landPlots) {
        friend.farmState.landPlots.forEach((plot) => {
          if (plot.cropId && plot.harvestAt && now >= plot.harvestAt) {
            // 成熟超过15分钟才能偷
            const maturityTime = new Date(plot.harvestAt).getTime();
            const minutesSinceMature = (now.getTime() - maturityTime) / (1000 * 60);
            if (minutesSinceMature > 15) {
              stealableCrops++;
            }
          }
        });
      }

      return {
        friend: {
          id: friend.id,
          username: friend.username || `Farmer_${friend.id.slice(-4)}`,
          avatar: friend.avatar,
          level: friend.level,
          stealableCrops,
        },
        cost: EXPLORE_COST,
      };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message.includes('Not enough coins') || error.message.includes('No friends')) {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
});
