import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';
import { GAME_CONSTANTS } from '@/services/gameService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/social/explore - 探索世界，寻找可偷窃的农场
 * 消耗50金币，返回一个有成熟作物的用户农场（排除自己）
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;
    const EXPLORE_COST = GAME_CONSTANTS.EXPLORE_COST;

    // 在事务中执行
    const result = await prisma.$transaction(async (tx) => {
      // 1. 检查用户金币
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, farmCoins: true },
      });

      if (!user) throw new Error('User not found');
      if (user.farmCoins < EXPLORE_COST) {
        throw new Error(`Not enough coins. Need ${EXPLORE_COST} coins to explore.`);
      }

      // 2. 扣除金币
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: EXPLORE_COST } },
      });

      // 3. 查找所有有成熟作物的用户（排除自己）
      const now = new Date();
      const matureThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 成熟超过15分钟

      // 查询所有有可偷窃作物的用户
      const usersWithMatureCrops = await tx.user.findMany({
        where: {
          id: { not: userId }, // 排除自己
          farmState: {
            landPlots: {
              some: {
                isUnlocked: true,
                cropId: { not: null },
                harvestAt: { lte: matureThreshold }, // 成熟超过15分钟
              },
            },
          },
        },
        select: {
          id: true,
          username: true,
          avatar: true,
          level: true,
          farmState: {
            include: {
              landPlots: {
                where: {
                  isUnlocked: true,
                  cropId: { not: null },
                  harvestAt: { lte: now },
                },
              },
            },
          },
        },
        take: 50, // 限制查询数量
      });

      if (usersWithMatureCrops.length === 0) {
        throw new Error('No farms with stealable crops found. Try again later!');
      }

      // 4. 计算每个用户的可偷作物数，并按数量排序（优先选择作物多的）
      const candidates = usersWithMatureCrops.map((targetUser) => {
        let stealableCrops = 0;
        if (targetUser.farmState?.landPlots) {
          targetUser.farmState.landPlots.forEach((plot) => {
            if (plot.cropId && plot.harvestAt && now >= plot.harvestAt) {
              const maturityTime = new Date(plot.harvestAt).getTime();
              const minutesSinceMature = (now.getTime() - maturityTime) / (1000 * 60);
              if (minutesSinceMature > 15) {
                stealableCrops++;
              }
            }
          });
        }
        return {
          id: targetUser.id,
          username: targetUser.username || `Farmer_${targetUser.id.slice(-4)}`,
          avatar: targetUser.avatar,
          level: targetUser.level,
          stealableCrops,
        };
      }).filter((c) => c.stealableCrops > 0);

      if (candidates.length === 0) {
        throw new Error('No farms with stealable crops found. Try again later!');
      }

      // 5. 按可偷作物数降序排序，增加选择高价值目标的概率
      candidates.sort((a, b) => b.stealableCrops - a.stealableCrops);

      // 6. 从前 50% 高价值目标中随机选择（平衡随机性和价值）
      const topCandidates = candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.5)));
      const selectedTarget = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      return {
        friend: selectedTarget,
        cost: EXPLORE_COST,
      };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message.includes('Not enough coins') || error.message.includes('No farms')) {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
});
