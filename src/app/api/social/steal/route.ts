import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService, GAME_CONSTANTS } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// 计算偷盗成功率
function calculateStealSuccessRate(params: {
  isTargetOnline: boolean;
  stealerLevel: number;
  targetLevel: number;
  cropUnlockLevel: number;
  stealerInvites: number;
  targetInvites: number;
  isFriend: boolean;
  recentStealCount: number;
  targetIsNewFarmer: boolean;
}): { rate: number; details: Record<string, string> } {
  let rate = GAME_CONSTANTS.BASE_SUCCESS_RATE;
  const details: Record<string, string> = {
    base_success_rate: `${GAME_CONSTANTS.BASE_SUCCESS_RATE * 100}%`,
  };

  // 1. 在线状态：目标在线降低成功率
  if (params.isTargetOnline) {
    rate -= 0.15;
    details.online = '-15% (target is online)';
  }

  // 2. 作物等级差：高级作物更难偷
  const cropLevelDiff = params.cropUnlockLevel - params.stealerLevel;
  if (cropLevelDiff > 0) {
    const penalty = Math.min(cropLevelDiff * 0.02, 0.2);
    rate -= penalty;
    details.crop_level_diff = `-${(penalty * 100).toFixed(0)}%`;
  }

  // 3. 等级差
  const levelDiff = params.stealerLevel - params.targetLevel;
  if (levelDiff > 0) {
    const bonus = Math.min(levelDiff * 0.01, 0.1);
    rate += bonus;
    details.level_diff = `+${(bonus * 100).toFixed(0)}%`;
  } else if (levelDiff < 0) {
    const penalty = Math.min(Math.abs(levelDiff) * 0.015, 0.15);
    rate -= penalty;
    details.level_diff = `-${(penalty * 100).toFixed(0)}%`;
  }

  // 4. 邀请数差
  const inviteDiff = params.stealerInvites - params.targetInvites;
  if (inviteDiff > 0) {
    const bonus = Math.min(inviteDiff * 0.005, 0.05);
    rate += bonus;
    details.invite_diff = `+${(bonus * 100).toFixed(0)}%`;
  }

  // 5. 好友关系
  if (params.isFriend) {
    rate -= 0.1;
    details.friendship_diff = '-10%';
  }

  // 6. 惯犯惩罚
  if (params.recentStealCount > 5) {
    const penalty = Math.min((params.recentStealCount - 5) * 0.03, 0.15);
    rate -= penalty;
    details.recidivist = `-${(penalty * 100).toFixed(0)}%`;
  }

  // 限制在 10% - 90% 之间
  rate = Math.max(0.1, Math.min(0.9, rate));

  return { rate, details };
}

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
      if (!plot || !plot.cropId || plot.growthStage < 4) throw new Error('No mature crop to steal');

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
        // 计算奖励 (100 是假设的基础价值)
        reward = Math.floor(100 * GAME_CONSTANTS.STEAL_AMOUNT * plot.boostMultiplier);
        
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

      return { success, reward, successRate, details, action };
    }, {
      timeout: 15000 // 增加超时时间到 15 秒
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Not enough energy' || error.message === 'Not enough coins') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
});
