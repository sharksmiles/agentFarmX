import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GameService, GAME_CONSTANTS, FarmStateWithPlots } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse, paymentRequiredResponse, hasValidPaymentHeader } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

const WATER_ENERGY_COST = 1;
const WATER_BOOST_MULTIPLIER = 1.1;

// Farming Skill 价格
const WATER_SKILL_PRICE = 0.001; // USDC

export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { plotIndex, mode } = body;
    const userId = context.auth.userId;

    // x402 支付检查 - Farming Skill 付费
    // 仅机器人执行时需要支付，手动操作(mode=manual)跳过支付
    if (mode !== 'manual' && !hasValidPaymentHeader(request)) {
      return paymentRequiredResponse(
        'water_crop',
        WATER_SKILL_PRICE,
        '/api/farm/water',
        'Water crop - Farmer Bot Skill'
      );
    }

    if (!userId || plotIndex === undefined) {
      return errorResponse('userId and plotIndex are required', 400);
    }

    const now = new Date();

    // 1. 在事务中处理浇水逻辑 (设置超时时间为 15秒)
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 获取农场状态并处理能量恢复 (Lazy Sync)
      // 在同一查询中获取所有地块，避免竞态条件
      const farmState = await GameService.syncUserStamina<FarmStateWithPlots>(userId, tx, {
        landPlots: true
      });

      if (!farmState) throw new Error('Farm state not found');

      // 校验能量
      if (farmState.energy < WATER_ENERGY_COST) throw new Error('Insufficient energy');

      // 校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots?.find((p) => p.plotIndex === dbPlotIndex);

      if (!plot) throw new Error(`Plot ${plotIndex} not found for user ${userId}`);
      if (!plot.cropId) throw new Error(`No crop to water on plot ${plotIndex}`);

      // 计算缩短后的收获时间 (SubTask 3.2: 缩短 5% 或最多 5 分钟)
      let newHarvestAt = plot.harvestAt;
      if (plot.harvestAt && plot.plantedAt && plot.plantedAt.getTime() <= plot.harvestAt.getTime()) {
        const totalDurationMs = plot.harvestAt.getTime() - plot.plantedAt.getTime();
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        
        // 缩短总周期的 5%，但封顶缩短 5 分钟 (统一毫秒单位)
        const reductionMs = Math.min(totalDurationMs * 0.05, FIVE_MINUTES_MS);
        newHarvestAt = new Date(plot.harvestAt.getTime() - reductionMs);
        
        // 确保不会比现在早
        if (newHarvestAt.getTime() < now.getTime()) {
          newHarvestAt = now;
        }
      }

      // 执行浇水操作并更新生长阶段
      const growthStage = GameService.calculateGrowthStage({
        ...plot,
        harvestAt: newHarvestAt,
      });

      const updatedPlot = await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST_MULTIPLIER,
          boostExpireAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour boost
          lastWateredAt: now,
          nextWateringDue: new Date(now.getTime() + 10 * 60 * 1000), // Next watering in 10 mins
          harvestAt: newHarvestAt,
          growthStage,
        } as any,
      });

      // 增加少量经验
      await GameService.processExpGain(userId, 2, tx);

      // 更新农场状态 (扣除能量)
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: { decrement: WATER_ENERGY_COST },
        },
      });

      // 返回最新用户数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    });

    if (!updatedUser) throw new Error('User data corruption after watering');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    const message = error.message || 'Internal server error';
    if (message.includes('not found')) {
      return notFoundResponse(message);
    }
    if (message.includes('Insufficient energy') || message.includes('No crop to water')) {
      return errorResponse(message, 400);
    }
    return internalErrorResponse(error);
  }
});
