import { prisma } from '@/lib/prisma';
import { BaseService, ServiceError } from './base.service';
import { GameService, GAME_CONSTANTS } from './gameService';
import { LandPlot, CropConfig } from '@prisma/client';

/**
 * 种植结果接口
 */
export interface PlantResult {
  plotId: string;
  cropId: string;
  plantedAt: Date;
  harvestAt: Date;
  energyCost: number;
}

/**
 * 收获结果接口
 */
export interface HarvestResult {
  plotId: string;
  cropId: string;
  reward: number;
  expGained: number;
  newBalance: number;
}

/**
 * 农场服务类
 * 处理农场相关的业务逻辑
 */
export class FarmService extends BaseService {
  /**
   * 获取用户农场状态
   */
  async getFarmState(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: {
          include: {
            landPlots: {
              orderBy: { plotIndex: 'asc' }
            }
          }
        },
        inventory: true,
      },
    });

    if (!user || !user.farmState) {
      throw ServiceError.notFound('Farm state', userId);
    }

    // 计算当前能量（不写入数据库）
    const recoveryInterval = await GameService.getSystemConfig(
      'energy_recovery_rate',
      GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS
    );
    
    const { newEnergy } = GameService.calculateRecoveredEnergy({
      currentEnergy: user.farmState.energy,
      maxEnergy: user.farmState.maxEnergy,
      lastUpdate: user.farmState.lastEnergyUpdate,
      recoveryIntervalMins: recoveryInterval
    });

    return {
      ...user,
      farmState: {
        ...user.farmState,
        energy: newEnergy,
      }
    };
  }

  /**
   * 种植作物
   */
  async plant(userId: string, plotIndex: number, cropId: string): Promise<PlantResult> {
    return this.withTransaction(async (tx) => {
      // 1. 获取作物配置
      const cropConfig = await tx.cropConfig.findUnique({
        where: { cropType: cropId },
      });

      if (!cropConfig) {
        throw ServiceError.badRequest(`Crop configuration not found: ${cropId}`);
      }

      // 2. 同步能量并获取农场状态
      const farmState = await GameService.syncUserStamina<{ landPlots: LandPlot[] }>(userId, tx, {
        landPlots: true
      });

      if (!farmState) {
        throw ServiceError.notFound('Farm state', userId);
      }

      // 3. 校验能量
      const energyCost = 5; // TODO: 从配置读取
      if (farmState.energy < energyCost) {
        throw ServiceError.badRequest('Insufficient energy');
      }

      // 4. 校验库存
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
        throw ServiceError.badRequest(`Insufficient seeds for ${cropId}`);
      }

      // 5. 校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots?.find((p: LandPlot) => p.plotIndex === dbPlotIndex);

      if (!plot) {
        throw ServiceError.notFound('Plot', String(plotIndex));
      }
      if (!plot.isUnlocked) {
        throw ServiceError.badRequest(`Plot ${plotIndex} is locked`);
      }
      if (plot.cropId) {
        throw ServiceError.conflict(`Plot ${plotIndex} already has a crop`);
      }

      // 6. 执行种植
      const now = new Date();
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
        },
      });

      // 7. 扣除种子
      await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: { decrement: 1 } },
      });

      // 8. 增加经验
      await GameService.processExpGain(userId, cropConfig.seedingExp || 5, tx);

      // 9. 扣除能量
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: { decrement: energyCost },
          totalPlants: { increment: 1 },
        },
      });

      return {
        plotId: plot.id,
        cropId,
        plantedAt: now,
        harvestAt,
        energyCost,
      };
    });
  }

  /**
   * 收获作物
   */
  async harvest(userId: string, plotIndex: number): Promise<HarvestResult> {
    return this.withTransaction(async (tx) => {
      // 1. 获取农场和地块状态
      const farmState = await tx.farmState.findUnique({
        where: { userId },
        include: { landPlots: true },
      });

      if (!farmState) {
        throw ServiceError.notFound('Farm state', userId);
      }

      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);
      
      if (!plot) {
        throw ServiceError.notFound('Plot', String(plotIndex));
      }
      if (!plot.cropId) {
        throw ServiceError.badRequest('No crop to harvest');
      }

      // 2. 获取作物配置
      const cropConfig = await tx.cropConfig.findUnique({
        where: { cropType: plot.cropId },
      });

      const reward = Math.floor(
        (cropConfig?.harvestPrice || 10) * (plot.boostMultiplier || 1.0)
      );
      const expGain = cropConfig?.harvestExp || 10;

      // 3. 更新地块状态
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

      // 4. 更新用户金币
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { increment: reward } },
      });

      // 5. 增加经验
      await GameService.processExpGain(userId, expGain, tx);

      // 6. 更新农场统计
      await tx.farmState.update({
        where: { id: farmState.id },
        data: { totalHarvests: { increment: 1 } },
      });

      // 7. 更新库存
      await tx.inventory.upsert({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: 'crop',
            itemId: plot.cropId,
          },
        },
        update: { quantity: { increment: 1 } },
        create: {
          userId,
          itemType: 'crop',
          itemId: plot.cropId,
          quantity: 1,
        },
      });

      return {
        plotId: plot.id,
        cropId: plot.cropId,
        reward,
        expGained: expGain,
        newBalance: updatedUser.farmCoins,
      };
    });
  }

  /**
   * 解锁地块
   */
  async unlockPlot(userId: string, plotIndex: number) {
    const LAND_UNLOCK_COSTS: Record<number, number> = {
      6: 500,
      7: 1000,
      8: 2000,
      9: 5000,
      10: 10000,
      11: 20000,
    };

    return this.withTransaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: { include: { landPlots: true } } },
      });

      if (!user || !user.farmState) {
        throw ServiceError.notFound('User or Farm state');
      }

      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const cost = LAND_UNLOCK_COSTS[dbPlotIndex];

      if (cost === undefined) {
        throw ServiceError.badRequest('Invalid plot index or not unlockable');
      }
      if (user.farmCoins < cost) {
        throw ServiceError.badRequest('Insufficient coins');
      }

      const existingPlot = user.farmState.landPlots.find(
        (p) => p.plotIndex === dbPlotIndex
      );
      if (existingPlot && existingPlot.isUnlocked) {
        throw ServiceError.conflict('Plot already unlocked');
      }

      // 执行解锁
      await tx.landPlot.upsert({
        where: {
          farmStateId_plotIndex: {
            farmStateId: user.farmState.id,
            plotIndex: dbPlotIndex,
          },
        },
        create: {
          farmStateId: user.farmState.id,
          plotIndex: dbPlotIndex,
          isUnlocked: true,
          growthStage: 0,
        },
        update: { isUnlocked: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: cost } },
      });

      await tx.farmState.update({
        where: { id: user.farmState.id },
        data: { unlockedLands: { increment: 1 } },
      });

      return { plotIndex, cost };
    });
  }

  /**
   * 获取作物配置列表
   */
  async getCropConfigs() {
    return this.prisma.cropConfig.findMany({
      where: { isActive: true },
      orderBy: { unlockLevel: 'asc' },
    });
  }

  /**
   * 获取等级配置
   */
  async getLevelConfigs() {
    return this.prisma.levelConfig.findMany({
      orderBy: { level: 'asc' },
    });
  }
}
