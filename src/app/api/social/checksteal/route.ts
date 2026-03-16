import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GAME_CONSTANTS, calculateStealSuccessRate } from '@/services/gameService';

/**
 * Check Steal Success Rate
 * Calculates the success rate for stealing a crop from a friend
 * 使用统一的 calculateStealSuccessRate 函数，与 steal API 保持一致
 */

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

    const now = new Date();

    // 并行获取用户和好友数据
    const [user, friend, friendship, recentSteals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { farmState: true },
      }),
      prisma.user.findUnique({
        where: { id: friendId },
        include: {
          farmState: {
            include: {
              landPlots: true,
            },
          },
        },
      }),
      // 检查好友关系
      prisma.socialAction.findFirst({
        where: {
          OR: [
            { fromUserId: userId, toUserId: friendId, actionType: 'friend_accept' },
            { fromUserId: friendId, toUserId: userId, actionType: 'friend_accept' },
          ],
        },
      }),
      // 检查24h内偷取次数
      prisma.socialAction.count({
        where: {
          fromUserId: userId,
          actionType: 'steal',
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // 查找目标地块
    const targetPlot = friend?.farmState?.landPlots.find(
      (plot) => plot.plotIndex === plotIndex
    );

    // 获取作物配置
    const cropConfig = targetPlot?.cropId 
      ? await prisma.cropConfig.findUnique({ where: { cropType: targetPlot.cropId } })
      : null;

    if (!user || !friend) {
      return NextResponse.json(
        { error: 'User or friend not found' },
        { status: 404 }
      );
    }

    if (!user.farmState || !friend.farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    if (!targetPlot || !targetPlot.cropId) {
      return NextResponse.json(
        { error: 'No crop found on this plot' },
        { status: 400 }
      );
    }

    // 检查作物是否成熟
    if (!targetPlot.harvestAt || now < targetPlot.harvestAt) {
      return NextResponse.json(
        { error: 'Crop is not mature yet' },
        { status: 400 }
      );
    }

    // 检查成熟是否超过15分钟（偷取条件）
    const minutesSinceMature = (now.getTime() - targetPlot.harvestAt.getTime()) / (1000 * 60);
    if (minutesSinceMature <= 15) {
      return NextResponse.json(
        { error: 'Crop must be mature for at least 15 minutes before stealing' },
        { status: 400 }
      );
    }

    // 判断目标是否在线（5分钟内活跃）
    const isTargetOnline = friend.lastLoginAt && 
      (now.getTime() - friend.lastLoginAt.getTime()) < 5 * 60 * 1000;

    // 简化处理作物等级（可后续从 CropConfig 获取）
    const cropUnlockLevel = 1;

    // 使用统一的成功率计算函数
    const { rate: successRate, details } = calculateStealSuccessRate({
      isTargetOnline: !!isTargetOnline,
      stealerLevel: user.level,
      targetLevel: friend.level,
      cropUnlockLevel,
      stealerInvites: user.inviteCount,
      targetInvites: friend.inviteCount,
      isFriend: !!friendship,
      recentStealCount: recentSteals,
      targetIsNewFarmer: friend.level < 5,
    });

    // 计算预期奖励（使用实际作物价值）
    const cropValue = cropConfig?.harvestPrice || 50; // 默认价值 50
    const stealingEarning = Math.floor(cropValue * GAME_CONSTANTS.STEAL_AMOUNT * targetPlot.boostMultiplier);
    const stealingExp = cropConfig?.harvestExp || 10; // 使用作物配置的经验或默认 10

    // 检查资源是否足够
    if (user.farmCoins < GAME_CONSTANTS.STEAL_COIN_COST) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    if (user.farmState.energy < GAME_CONSTANTS.STEAL_ENERGY_COST) {
      return NextResponse.json(
        { error: 'Insufficient energy' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success_rate_details: {
        ...details,
        final_success_rate: Math.round(successRate * 100),
      },
      stealing_earning: stealingEarning,
      stealing_exp: stealingExp,
      stealing_cost: GAME_CONSTANTS.STEAL_COIN_COST,
      stealing_crop_name: targetPlot.cropId,
      crop_id: targetPlot.id,
      plotIndex: targetPlot.plotIndex,
    });
  } catch (error) {
    console.error('POST /api/social/checksteal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
