import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BASE_SUCCESS_RATE = 0.5; // 50% base success rate
const STEAL_AMOUNT = 0.2; // Steal 20% of crop value
const STEAL_ENERGY_COST = 1;
const STEAL_COIN_COST = 100;

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
  let rate = BASE_SUCCESS_RATE;
  const details: Record<string, string> = {
    base_success_rate: `${BASE_SUCCESS_RATE * 100}%`,
  };

  // 1. 在线状态：目标在线降低成功率
  if (params.isTargetOnline) {
    rate -= 0.15;
    details.online = '-15% (target is online)';
  } else {
    details.online = '0% (target offline)';
  }

  // 2. 作物等级差：高级作物更难偷
  const cropLevelDiff = params.cropUnlockLevel - params.stealerLevel;
  if (cropLevelDiff > 0) {
    const penalty = Math.min(cropLevelDiff * 0.02, 0.2);
    rate -= penalty;
    details.crop_level_diff = `-${(penalty * 100).toFixed(0)}% (crop level ${params.cropUnlockLevel} vs stealer level ${params.stealerLevel})`;
  } else {
    details.crop_level_diff = '0%';
  }

  // 3. 等级差：等级高的偷等级低的更容易
  const levelDiff = params.stealerLevel - params.targetLevel;
  if (levelDiff > 0) {
    const bonus = Math.min(levelDiff * 0.01, 0.1);
    rate += bonus;
    details.level_diff = `+${(bonus * 100).toFixed(0)}% (stealer level ${params.stealerLevel} vs target level ${params.targetLevel})`;
  } else if (levelDiff < 0) {
    const penalty = Math.min(Math.abs(levelDiff) * 0.015, 0.15);
    rate -= penalty;
    details.level_diff = `-${(penalty * 100).toFixed(0)}% (target is higher level)`;
  } else {
    details.level_diff = '0%';
  }

  // 4. 邀请数差：邀请多的人偷邀请少的更容易
  const inviteDiff = params.stealerInvites - params.targetInvites;
  if (inviteDiff > 0) {
    const bonus = Math.min(inviteDiff * 0.005, 0.05);
    rate += bonus;
    details.invite_diff = `+${(bonus * 100).toFixed(0)}% (stealer has ${params.stealerInvites} invites vs target ${params.targetInvites})`;
  } else {
    details.invite_diff = '0%';
  }

  // 5. 好友关系：偷好友降低成功率
  if (params.isFriend) {
    rate -= 0.1;
    details.friendship_diff = '-10% (stealing from friend)';
  } else {
    details.friendship_diff = '0%';
  }

  // 6. 惯犯惩罚：最近24小时内偷盗次数过多
  if (params.recentStealCount > 5) {
    const penalty = Math.min((params.recentStealCount - 5) * 0.03, 0.15);
    rate -= penalty;
    details.recidivist = `-${(penalty * 100).toFixed(0)}% (${params.recentStealCount} recent steals)`;
  } else {
    details.recidivist = '0%';
  }

  // 7. 新手保护：目标是新手（等级<5）提高成功率
  if (params.targetIsNewFarmer) {
    rate += 0.1;
    details.new_farmer = '+10% (target is new farmer)';
  } else {
    details.new_farmer = '0%';
  }

  // 限制在 10% - 90% 之间
  rate = Math.max(0.1, Math.min(0.9, rate));

  return { rate, details };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId, plotIndex } = body;

    if (!userId || !friendId || plotIndex === undefined) {
      return NextResponse.json(
        { error: 'userId, friendId, and plotIndex are required' },
        { status: 400 }
      );
    }

    // 获取偷盗者信息
    const stealer = await prisma.user.findUnique({
      where: { id: userId },
      include: { farmState: true },
    });

    if (!stealer) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 检查能量
    if ((stealer.farmState?.energy || 0) < STEAL_ENERGY_COST) {
      return NextResponse.json(
        { error: 'Not enough energy' },
        { status: 400 }
      );
    }

    // 检查金币
    if (stealer.farmCoins < STEAL_COIN_COST) {
      return NextResponse.json(
        { error: 'Not enough coins' },
        { status: 400 }
      );
    }

    // 获取目标农场
    const target = await prisma.user.findUnique({
      where: { id: friendId },
      include: {
        farmState: {
          include: { landPlots: true },
        },
      },
    });

    if (!target || !target.farmState) {
      return NextResponse.json(
        { error: 'Target farm not found' },
        { status: 404 }
      );
    }

    const plot = target.farmState.landPlots.find((p) => p.plotIndex === plotIndex);

    if (!plot || !plot.cropId || plot.growthStage < 4) {
      return NextResponse.json(
        { error: 'No mature crop to steal' },
        { status: 400 }
      );
    }

    // 检查是否是好友
    const friendship = await prisma.socialAction.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: friendId, actionType: 'friend_accept' },
          { fromUserId: friendId, toUserId: userId, actionType: 'friend_accept' },
        ],
      },
    });

    // 获取最近24小时的偷盗次数
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSteals = await prisma.socialAction.count({
      where: {
        fromUserId: userId,
        actionType: 'steal',
        createdAt: { gte: oneDayAgo },
      },
    });

    // 检查目标是否在线（最近5分钟有活动）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isTargetOnline = target.lastLoginAt > fiveMinutesAgo;

    // 获取作物解锁等级（这里简化处理，实际应从 CropConfig 读取）
    const cropUnlockLevels: Record<string, number> = {
      Wheat: 1, Corn: 3, Potato: 5, Tomato: 7, Carrot: 9,
      Apple: 19, Banana: 21, Pear: 23,
    };
    const cropUnlockLevel = cropUnlockLevels[plot.cropId] || 1;

    // 计算成功率
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

    // 执行偷盗
    const success = Math.random() < successRate;
    let reward = 0;

    // 扣除能量和金币
    await prisma.user.update({
      where: { id: userId },
      data: {
        farmCoins: { decrement: STEAL_COIN_COST },
      },
    });

    await prisma.farmState.update({
      where: { userId: userId },
      data: {
        energy: { decrement: STEAL_ENERGY_COST },
      },
    });

    if (success) {
      // 获取作物价值（应从 CropConfig 读取）
      const cropValues: Record<string, number> = {
        Wheat: 30, Corn: 60, Potato: 90, Tomato: 120, Carrot: 150,
        Apple: 300, Banana: 330, Pear: 360,
      };
      const baseValue = cropValues[plot.cropId] || 50;
      reward = Math.floor(baseValue * STEAL_AMOUNT * plot.boostMultiplier);

      // 给予奖励
      await prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: reward },
        },
      });

      // 标记作物为已偷
      await prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          growthStage: 0,
          cropId: null,
          plantedAt: null,
          harvestAt: null,
        },
      });
    }

    // 记录偷盗行为
    const socialAction = await prisma.socialAction.create({
      data: {
        fromUserId: userId,
        toUserId: friendId,
        actionType: 'steal',
        metadata: {
          plotIndex,
          success,
          reward,
          cropId: plot.cropId,
          successRate: Math.round(successRate * 100),
          successRateDetails: details,
          energyCost: STEAL_ENERGY_COST,
          coinCost: STEAL_COIN_COST,
        },
      },
    });

    return NextResponse.json({
      success,
      reward,
      successRate: Math.round(successRate * 100),
      successRateDetails: details,
      energyCost: STEAL_ENERGY_COST,
      coinCost: STEAL_COIN_COST,
      action: socialAction,
    });
  } catch (error) {
    console.error('POST /api/social/steal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
