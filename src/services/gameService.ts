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
  BASE_SUCCESS_RATE: 0.5,        // 基础偷取成功率 50%
  STEAL_AMOUNT: 0.4,             // 偷取作物价值的 40%
  STEAL_ENERGY_COST: 1,          // 偷取消耗 1 能量
  STEAL_COIN_COST: 20,           // 偷取消耗 20 金币
  EXPLORE_COST: 20,              // 探索消耗 20 金币
  ENERGY_RECOVERY_INTERVAL_MINS: 5,
  BASE_MAX_ENERGY: 100,
  DEFAULT_UNLOCKED_LANDS: 6,
  DAILY_BOOST_COUNT: 3,
};

/**
 * 偷取成功率计算参数
 */
export interface StealSuccessRateParams {
  isTargetOnline: boolean;       // 目标是否在线
  stealerLevel: number;          // 偷盗者等级
  targetLevel: number;           // 目标等级
  cropUnlockLevel: number;       // 作物解锁等级
  stealerInvites: number;        // 偷盗者邀请数
  targetInvites: number;         // 目标邀请数
  isFriend: boolean;             // 是否是好友
  recentStealCount: number;      // 24h内偷取次数
  targetIsNewFarmer: boolean;    // 目标是否是新手 (等级<5)
}

/**
 * 偷取成功率计算结果
 */
export interface StealSuccessRateResult {
  rate: number;                  // 最终成功率 (0-1)
  details: Record<string, string>; // 各因素详情
}

/**
 * 计算偷取成功率
 * 统一的计算函数，供 checksteal 和 steal API 共用
 */
export function calculateStealSuccessRate(params: StealSuccessRateParams): StealSuccessRateResult {
  let rate = GAME_CONSTANTS.BASE_SUCCESS_RATE;
  const details: Record<string, string> = {
    base_success_rate: `${GAME_CONSTANTS.BASE_SUCCESS_RATE * 100}%`,
  };

  // 1. 在线状态：目标在线降低成功率
  if (params.isTargetOnline) {
    rate -= 0.15;
    details.online = '-15%';
  } else {
    details.online = '0%';
  }

  // 2. 作物等级差：高级作物更难偷
  const cropLevelDiff = params.cropUnlockLevel - params.stealerLevel;
  if (cropLevelDiff > 0) {
    const penalty = Math.min(cropLevelDiff * 0.02, 0.2);
    rate -= penalty;
    details.crop_level_diff = `-${(penalty * 100).toFixed(0)}%`;
  } else {
    details.crop_level_diff = '0%';
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
  } else {
    details.level_diff = '0%';
  }

  // 4. 邀请数差
  const inviteDiff = params.stealerInvites - params.targetInvites;
  if (inviteDiff > 0) {
    const bonus = Math.min(inviteDiff * 0.005, 0.05);
    rate += bonus;
    details.invite_diff = `+${(bonus * 100).toFixed(0)}%`;
  } else {
    details.invite_diff = '0%';
  }

  // 5. 好友关系
  if (params.isFriend) {
    rate -= 0.1;
    details.friendship_diff = '-10%';
  } else {
    details.friendship_diff = '0%';
  }

  // 6. 惯犯惩罚：24h内偷取超过5次后，每次额外惩罚
  if (params.recentStealCount > 5) {
    const penalty = Math.min((params.recentStealCount - 5) * 0.03, 0.15);
    rate -= penalty;
    details.recidivist = `-${(penalty * 100).toFixed(0)}%`;
  } else {
    details.recidivist = '0%';
  }

  // 7. 新手保护：目标等级<5时，降低成功率
  if (params.targetIsNewFarmer) {
    rate -= 0.15;
    details.new_farmer = '-15%';
  } else {
    details.new_farmer = '0%';
  }

  // 限制在 10% - 90% 之间
  rate = Math.max(0.1, Math.min(0.9, rate));
  details.final_success_rate = `${Math.round(rate * 100)}%`;

  return { rate, details };
}

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
