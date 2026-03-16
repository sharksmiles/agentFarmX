import { prisma } from '../../lib/prisma';
import { FarmState, LandPlot, CropConfig, LevelConfig } from '@prisma/client';
import { CacheService, CacheKey, CacheTTL } from '@/lib/cache';

export type FarmStateWithPlots = {
  landPlots: LandPlot[];
};

export type StaminaSyncResult<T = {}> = T & FarmState & {
  recovered: number;
};

/**
 * 游戏常量配置
 */
export const GAME_CONSTANTS = {
  BASE_SUCCESS_RATE: 0.5,
  STEAL_AMOUNT: 0.2,
  STEAL_ENERGY_COST: 1,
  STEAL_COIN_COST: 100,
  ENERGY_RECOVERY_INTERVAL_MINS: 5,
  BASE_MAX_ENERGY: 100,
  DEFAULT_UNLOCKED_LANDS: 6,
  DAILY_BOOST_COUNT: 3,
};

/**
 * 游戏服务类
 * 处理体力同步、经验获取等核心游戏逻辑
 */
export class GameService {
  /**
   * 获取系统配置（带缓存）
   */
  static async getSystemConfig(key: string, defaultValue: any, tx?: any): Promise<any> {
    // 如果在事务中，直接查询数据库
    if (tx) {
      try {
        const config = await tx.systemConfig.findUnique({
          where: { key },
        });
        return config?.value ?? defaultValue;
      } catch (error) {
        console.error(`[GameService] Error fetching config for ${key}:`, error);
        return defaultValue;
      }
    }

    // 使用缓存
    const cacheKey = `system_config:${key}`;
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const config = await prisma.systemConfig.findUnique({
            where: { key },
          });
          return config?.value ?? defaultValue;
        } catch (error) {
          console.error(`[GameService] Error fetching config for ${key}:`, error);
          return defaultValue;
        }
      },
      { ttl: CacheTTL.LONG }
    );
  }

  /**
   * 统一能量恢复计算逻辑
   */
  static calculateRecoveredEnergy(params: {
    currentEnergy: number;
    maxEnergy: number;
    lastUpdate: Date;
    recoveryIntervalMins: number;
  }): { newEnergy: number; newLastUpdate: Date; recovered: number } {
    const { currentEnergy, maxEnergy, lastUpdate, recoveryIntervalMins } = params;
    const now = new Date();
    
    if (currentEnergy >= maxEnergy) {
      return { newEnergy: currentEnergy, newLastUpdate: now, recovered: 0 };
    }

    const msPerEnergy = recoveryIntervalMins * 60 * 1000;
    const msPassed = now.getTime() - lastUpdate.getTime();
    
    const energyToRecover = Math.floor(msPassed / msPerEnergy);
    if (energyToRecover <= 0) {
      return { newEnergy: currentEnergy, newLastUpdate: lastUpdate, recovered: 0 };
    }

    const actualRecovery = Math.min(energyToRecover, maxEnergy - currentEnergy);
    const newEnergy = currentEnergy + actualRecovery;
    const newLastUpdate = new Date(lastUpdate.getTime() + actualRecovery * msPerEnergy);

    return { newEnergy, newLastUpdate, recovered: actualRecovery };
  }

  /**
   * 获取能量恢复间隔 (分钟)
   * @param client Prisma 客户端或事务对象
   * @returns 恢复间隔分钟数
   */
  static async getEnergyRecoveryInterval(client: any = prisma): Promise<number> {
    const config = await this.getSystemConfig(
      'energy_recovery_rate', 
      { intervalMinutes: GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS },
      client
    );

    let recoveryIntervalMins = GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS;
    if (config && typeof config === 'object') {
      if (config.intervalMinutes) {
        recoveryIntervalMins = config.intervalMinutes;
      } else if (config.rate) {
        recoveryIntervalMins = 1 / config.rate;
      }
    } else if (typeof config === 'number') {
      recoveryIntervalMins = config;
    }

    return recoveryIntervalMins;
  }

  /**
   * 同步用户体力 (Lazy Sync 模式)
   * 在用户进行任何消耗能量的操作前调用，确保其能量是最新的
   * @param userId 用户 ID
   * @param tx 可选的 Prisma 事务对象
   * @param include 可选的关联查询
   * @returns 更新后的 FarmState (带 recovered 字段) 或 null
   */
  static async syncUserStamina<T = {}>(userId: string, tx?: any, include?: any): Promise<StaminaSyncResult<T> | null> {
    const client = tx || prisma;
    
    // 1. 获取用户农场状态
    const farmState = await client.farmState.findUnique({
      where: { userId },
      include,
    }) as (FarmState & T) | null;

    if (!farmState) {
      console.warn(`[GameService] FarmState not found for user ${userId}`);
      return null;
    }

    // 2. 获取能量恢复配置
    const recoveryIntervalMins = await this.getEnergyRecoveryInterval(client);

    // 3. 计算恢复后的能量
    const { newEnergy, newLastUpdate, recovered } = this.calculateRecoveredEnergy({
      currentEnergy: farmState.energy,
      maxEnergy: farmState.maxEnergy,
      lastUpdate: farmState.lastEnergyUpdate,
      recoveryIntervalMins,
    });

    // 4. 如果有能量恢复，更新数据库
    if (recovered > 0) {
      console.log(`[GameService] Syncing stamina for user ${userId}: recovered ${recovered} energy`);
      const updated = await client.farmState.update({
        where: { userId },
        data: {
          energy: newEnergy,
          lastEnergyUpdate: newLastUpdate,
        },
        include,
      }) as FarmState & T;
      return { ...updated, recovered } as StaminaSyncResult<T>;
    }

    return { ...farmState, recovered: 0 } as StaminaSyncResult<T>;
  }

  /**
   * 处理经验获取逻辑，支持事务
   * @param userId 用户 ID
   * @param gainedExp 获得的经验值
   * @param tx 可选的 Prisma 事务对象
   */
  static async processExpGain(userId: string, gainedExp: number, tx?: any) {
    const client = tx || prisma;
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { level: true, experience: true }
    });

    if (!user) throw new Error('User not found');

    let newLevel = user.level;
    let totalExp = user.experience + gainedExp;

    // 简单循环检查升级，实际应优化为查询 LevelConfig
    const nextLevelConfig = await client.levelConfig.findUnique({
      where: { level: newLevel + 1 }
    });

    if (nextLevelConfig && totalExp >= nextLevelConfig.requiredExp) {
      newLevel += 1;
      // 可以在此处添加升级奖励逻辑
    }

    return await client.user.update({
      where: { id: userId },
      data: {
        experience: totalExp,
        level: newLevel
      }
    });
  }

  /**
   * 获取作物配置（带缓存）
   */
  static async getCropConfig(cropType: string, tx?: any): Promise<CropConfig | null> {
    // 如果在事务中，直接查询数据库
    if (tx) {
      return await tx.cropConfig.findUnique({
        where: { cropType },
      });
    }

    // 使用缓存
    const cacheKey = `${CacheKey.CROP_CONFIG_BY_ID}${cropType}`;
    return CacheService.getOrSet(
      cacheKey,
      () => prisma.cropConfig.findUnique({ where: { cropType } }),
      { ttl: CacheTTL.LONG }
    );
  }

  /**
   * 获取所有作物配置（带缓存）
   */
  static async getAllCropConfigs(tx?: any): Promise<CropConfig[]> {
    if (tx) {
      return await tx.cropConfig.findMany();
    }

    return CacheService.getOrSet(
      CacheKey.CROP_CONFIGS,
      () => prisma.cropConfig.findMany(),
      { ttl: CacheTTL.LONG }
    );
  }

  /**
   * 获取等级配置（带缓存）
   */
  static async getLevelConfig(level: number, tx?: any): Promise<LevelConfig | null> {
    if (tx) {
      return await tx.levelConfig.findUnique({
        where: { level },
      });
    }

    const cacheKey = `${CacheKey.LEVEL_CONFIG_BY_ID}${level}`;
    return CacheService.getOrSet(
      cacheKey,
      () => prisma.levelConfig.findUnique({ where: { level } }),
      { ttl: CacheTTL.LONG }
    );
  }

  /**
   * 获取所有等级配置（带缓存）
   */
  static async getAllLevelConfigs(tx?: any): Promise<LevelConfig[]> {
    if (tx) {
      return await tx.levelConfig.findMany({ orderBy: { level: 'asc' } });
    }

    return CacheService.getOrSet(
      CacheKey.LEVEL_CONFIGS,
      () => prisma.levelConfig.findMany({ orderBy: { level: 'asc' } }),
      { ttl: CacheTTL.LONG }
    );
  }

  /**
   * 计算作物生长阶段 (1-4)
   * @param plot 地块数据
   * @returns 当前生长阶段
   */
  static calculateGrowthStage(plot: {
    plantedAt: Date | null;
    harvestAt: Date | null;
    growthStage: number;
    cropId?: string | null;
  }): number {
    if (!plot.plantedAt || !plot.harvestAt) return plot.growthStage;
    
    const now = new Date();
    if (now >= plot.harvestAt) return 4; // 成熟

    // 后续可以根据 cropId (即作物类型) 获取不同的生长曲线
    // 目前采用统一的线性生长逻辑
    const totalDuration = plot.harvestAt.getTime() - plot.plantedAt.getTime();
    const elapsed = now.getTime() - plot.plantedAt.getTime();
    
    if (elapsed <= 0) return 1;

    const progress = elapsed / totalDuration;
    
    if (progress < 0.33) return 1;
    if (progress < 0.66) return 2;
    if (progress < 1.0) return 3;
    
    return 4;
  }
}
