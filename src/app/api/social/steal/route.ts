import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService, GAME_CONSTANTS, calculateStealSuccessRate } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/social/steal - Steal from another farm
 * 需要认证：从Token中获取用户ID
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { friendId, plotIndex } = body;
    const userId = context.auth.userId; // 从认证上下文获取用户ID

    if (!friendId || plotIndex === undefined) {
      return errorResponse('friendId and plotIndex are required', 400);
    }

    const now = new Date();

    // 1. 在事务外获取配置，减少事务时间
    const recoveryIntervalMins = await GameService.getEnergyRecoveryInterval();

    // 2. 在事务中执行偷盗逻辑 (设置超时时间为 15秒)
    const result = await prisma.$transaction(async (tx) => {
      // 获取偷盗者并处理能量恢复
      const stealer = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: true },
      });

      if (!stealer || !stealer.farmState) throw new Error('Stealer not found');

      const { newEnergy, newLastUpdate } = GameService.calculateRecoveredEnergy({
        currentEnergy: stealer.farmState.energy,
        maxEnergy: stealer.farmState.maxEnergy,
        lastUpdate: stealer.farmState.lastEnergyUpdate,
        recoveryIntervalMins: recoveryIntervalMins,
      });

      // 检查资源是否足够
      if (newEnergy < GAME_CONSTANTS.STEAL_ENERGY_COST) throw new Error('Not enough energy');
      if (stealer.farmCoins < GAME_CONSTANTS.STEAL_COIN_COST) throw new Error('Not enough coins');

      // 获取目标农场及作物
      const target = await tx.user.findUnique({
        where: { id: friendId },
        include: { farmState: { include: { landPlots: true } } },
      });

      if (!target || !target.farmState) throw new Error('Target farm not found');
      
      const plot = target.farmState.landPlots.find((p) => p.plotIndex === plotIndex);
      if (!plot || !plot.cropId) throw new Error('Plot not found or no crop planted');
      
      // 判断作物是否成熟：growthStage >= 4 或者 harvestAt 时间已过
      const isMature = plot.growthStage >= 4 || (plot.harvestAt && now >= new Date(plot.harvestAt));
      if (!isMature) throw new Error('No mature crop to steal');

      // 获取社交行为背景
      const friendship = await tx.socialAction.findFirst({
        where: {
          OR: [
            { fromUserId: userId, toUserId: friendId, actionType: 'friend_accept' },
            { fromUserId: friendId, toUserId: userId, actionType: 'friend_accept' },
          ],
        },
      });

      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentSteals = await tx.socialAction.count({
        where: { fromUserId: userId, actionType: 'steal', createdAt: { gte: oneDayAgo } },
      });

      const isTargetOnline = target.lastLoginAt > new Date(now.getTime() - 5 * 60 * 1000);
      
      // 简化处理作物等级
      const cropUnlockLevel = 1; 

      const { rate: successRate, details } = calculateStealSuccessRate({
        isTargetOnline,
        stealerLevel: stealer.level,
        targetLevel: target.level,
        cropUnlockLevel,
        stealerInvites: stealer.inviteCount,
        targetInvites: target.inviteCount,
        isFriend: !!friendship,
        recentStealCount: recentSteals,
        targetIsNewFarmer: target.level < 5,
      });

      // 执行扣除与奖励
      const success = Math.random() < successRate;
      let reward = 0;

      // 扣除偷盗者资源
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: GAME_CONSTANTS.STEAL_COIN_COST } }
      });

      await tx.farmState.update({
        where: { userId: userId },
        data: { 
          energy: { decrement: GAME_CONSTANTS.STEAL_ENERGY_COST },
          lastEnergyUpdate: newLastUpdate 
        }
      });

      if (success) {
        // 获取作物配置，计算实际奖励
        const cropConfig = await tx.cropConfig.findUnique({
          where: { cropType: plot.cropId! }
        });
        const cropValue = cropConfig?.harvestPrice || 50; // 默认价值 50
        
        // 奖励 = 作物收获价 * 偷取比例 * 加成倍率
        reward = Math.floor(cropValue * GAME_CONSTANTS.STEAL_AMOUNT * plot.boostMultiplier);
        
        await tx.user.update({
          where: { id: userId },
          data: { farmCoins: { increment: reward } }
        });

        // 清除目标地块
        await tx.landPlot.update({
          where: { id: plot.id },
          data: {
            growthStage: 0,
            cropId: null,
            plantedAt: null,
            harvestAt: null,
          }
        });
      }

      // 记录社交动作
      const action = await tx.socialAction.create({
        data: {
          fromUserId: userId,
          toUserId: friendId,
          actionType: 'steal',
          metadata: { success, reward, successRate: Math.round(successRate * 100), details }
        }
      });

      // 获取更新后的用户信息
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { farmCoins: true, experience: true, level: true }
      });

      return { success, reward, successRate, details, action, updatedSelf: updatedUser };
    });

    return successResponse(result);
  } catch (error: any) {
    if (
      error.message === 'Not enough energy' ||
      error.message === 'Not enough coins' ||
      error.message === 'No mature crop to steal' ||
      error.message === 'Plot not found or no crop planted'
    ) {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
});
