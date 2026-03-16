import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GameService } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// POST /api/farm/harvest - Harvest a crop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex } = body;

    if (!userId || plotIndex === undefined) {
      return errorResponse('userId and plotIndex are required', 400);
    }

    // 1-based vs 0-based index normalization
    const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;

    // 在单个事务中处理收获逻辑 (设置超时时间为 15秒)
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取农场和地块状态
      const farmState = await tx.farmState.findUnique({
        where: { userId },
        include: { landPlots: true },
      });

      if (!farmState) throw new Error('Farm state not found');

      const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);
      if (!plot) throw new Error('Plot not found');
      if (!plot.cropId) throw new Error('No crop to harvest');

      // 2. 获取作物配置以计算收益
      const cropConfig = await GameService.getCropConfig(plot.cropId, tx);
      const reward = Math.floor((cropConfig?.harvestPrice || 10) * (plot.boostMultiplier || 1.0));
      const expGain = cropConfig?.harvestExp || 10;

      // 3. 更新地块状态 (重置)
      await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          cropId: null,
          plantedAt: null,
          harvestAt: null,
          growthStage: 0,
          boostMultiplier: 1.0,
          boostExpireAt: null,
        },
      });

      // 4. 更新用户金币和经验 (处理可能的升级)
      await tx.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: reward },
        },
      });
      
      await GameService.processExpGain(userId, expGain, tx);

      // 5. 更新统计数据
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          totalHarvests: { increment: 1 },
        },
      });

      // 6. 更新库存
      await tx.inventory.upsert({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: 'crop',
            itemId: plot.cropId,
          },
        },
        update: {
          quantity: { increment: 1 },
        },
        create: {
          userId,
          itemType: 'crop',
          itemId: plot.cropId,
          quantity: 1,
        },
      });

      // 7. 返回最新状态
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    }, {
      timeout: 15000 // 增加超时时间到 15 秒
    });

    if (!updatedUser) throw new Error('User data corruption after harvest');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'Farm state not found' || error.message === 'Plot not found') {
      return notFoundResponse(error.message);
    }
    if (error.message === 'No crop to harvest') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
