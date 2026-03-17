import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GameService, GAME_CONSTANTS, FarmStateWithPlots } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/farm/plant - Plant a crop
 * 需要认证：从Token中获取用户ID
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { plotIndex, cropId } = body;
    const userId = context.auth.userId; // 从认证上下文获取用户ID

    if (plotIndex === undefined || !cropId) {
      return errorResponse('plotIndex and cropId are required', 400);
    }

    const now = new Date();

    // 在单个事务中执行种植逻辑，确保资源扣除与状态更新保持原子性
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取作物配置
      const cropConfig = await GameService.getCropConfig(cropId, tx);
      if (!cropConfig) throw new Error('Crop configuration not found');

      // 2. 获取用户农场状态并同步体力 (Lazy Sync)
      // 在同一查询中获取所有地块，避免竞态条件
      const farmState = await GameService.syncUserStamina<FarmStateWithPlots>(userId, tx, {
        landPlots: true
      });
      
      if (!farmState) throw new Error('Farm state not found');

      // 3. 校验能量与库存
      // 假设种植成本从 CropConfig 获取，如果没有则默认 5 (这里逻辑可根据实际配置调整)
      const energyCost = 5; 
      if (farmState.energy < energyCost) throw new Error('Insufficient energy');

      const inventoryItem = await tx.inventory.findUnique({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: 'crop',
            itemId: cropId,
          },
        },
      });

      if (!inventoryItem || inventoryItem.quantity <= 0) {
        throw new Error(`Insufficient seeds for ${cropId}`);
      }

      // 4. 校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots?.find((p) => p.plotIndex === dbPlotIndex);

      if (!plot) throw new Error(`Plot ${plotIndex} not found for user ${userId}`);
      if (!plot.isUnlocked) throw new Error(`Plot ${plotIndex} is locked`);
      if (plot.cropId) throw new Error(`Plot ${plotIndex} already has a crop`);

      // 5. 执行种植操作
      const harvestAt = new Date(now.getTime() + cropConfig.matureTime * 60 * 1000);
      const wateringInterval = cropConfig.wateringPeriod || 10;
      
      const growthStage = 1; // 种植初期始终为阶段 1

      await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          cropId,
          plantedAt: now,
          harvestAt,
          lastWateredAt: now,
          nextWateringDue: new Date(now.getTime() + wateringInterval * 60 * 1000),
          growthStage,
        } as any,
      });

      // 6. 扣除种子并增加经验
      await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: { decrement: 1 } },
      });

      await GameService.processExpGain(userId, cropConfig.seedingExp || 5, tx);

      // 7. 更新农场状态 (扣除能量)
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: { decrement: energyCost },
          totalPlants: { increment: 1 },
        },
      });

      // 8. 创建交易记录 (用于任务追踪)
      const user = await tx.user.findUnique({ where: { id: userId } });
      await tx.transaction.create({
        data: {
          userId,
          type: 'plant',
          category: 'farm',
          amount: 0,
          balance: user?.farmCoins || 0,
          description: `Planted ${cropId} on plot ${plotIndex}`,
        },
      });

      // 9. 返回最新用户数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    });

    if (!updatedUser) throw new Error('User data corruption after planting');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    const message = error.message || 'Internal server error';
    if (message.includes('not found')) {
      return notFoundResponse(message);
    }
    if (message.includes('Insufficient energy') || message.includes('is locked') || message.includes('already has a crop') || message.startsWith('Insufficient seeds')) {
      return errorResponse(message, 400);
    }
    return internalErrorResponse(error);
  }
});
