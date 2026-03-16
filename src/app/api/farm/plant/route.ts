import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { getCropConfig, processExpGain, calculateRecoveredEnergy, getSystemConfig, GAME_CONSTANTS } from '@/utils/func/gameLogic';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// POST /api/farm/plant - Plant a crop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex, cropId } = body;

    if (!userId || plotIndex === undefined || !cropId) {
      return errorResponse('userId, plotIndex, and cropId are required', 400);
    }

    const now = new Date();

    // 在单个事务中执行种植逻辑，确保资源扣除与状态更新的原子性
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取作物配置
      const cropConfig = await getCropConfig(cropId);
      if (!cropConfig) throw new Error('Crop configuration not found');

      // 2. 获取用户农场状态并处理能量恢复
      const farmState = await tx.farmState.findUnique({
        where: { userId },
        include: { landPlots: true },
      });

      if (!farmState) throw new Error('Farm state not found');

      const recoveryInterval = await getSystemConfig('energy_recovery_rate', GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS);
      const { newEnergy, newLastUpdate } = calculateRecoveredEnergy({
        currentEnergy: farmState.energy,
        maxEnergy: farmState.maxEnergy,
        lastUpdate: farmState.lastEnergyUpdate,
        recoveryIntervalMins: recoveryInterval
      });

      // 3. 校验能量与库存
      // 假设种植成本从 CropConfig 获取，如果没有则默认 5 (这里逻辑可根据实际配置调整)
      const energyCost = 5; 
      if (newEnergy < energyCost) throw new Error('Insufficient energy');

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

      // 4. 获取并校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);

      if (!plot) throw new Error('Plot not found');
      if (!plot.isUnlocked) throw new Error('Plot is locked');
      if (plot.cropId) throw new Error('Plot already has a crop');

      // 5. 执行种植操作
      const harvestAt = new Date(now.getTime() + cropConfig.matureTime * 60 * 1000);
      const wateringInterval = cropConfig.wateringPeriod || 10;

      await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          cropId,
          plantedAt: now,
          harvestAt,
          lastWateredAt: now,
          nextWateringDue: new Date(now.getTime() + wateringInterval * 60 * 1000),
          growthStage: 1,
        } as any,
      });

      // 6. 扣除种子并增加经验
      await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: { decrement: 1 } },
      });

      await processExpGain(tx, userId, cropConfig.seedingExp || 5);

      // 7. 更新农场状态 (扣除能量)
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: newEnergy - energyCost,
          totalPlants: { increment: 1 },
          lastEnergyUpdate: newLastUpdate,
        },
      });

      // 8. 返回最新用户数据
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
    if (error.message === 'Farm state not found' || error.message === 'Plot not found' || error.message === 'Crop configuration not found') {
      return notFoundResponse(error.message);
    }
    if (error.message === 'Insufficient energy' || error.message === 'Plot is locked' || error.message === 'Plot already has a crop' || error.message.startsWith('Insufficient seeds')) {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
