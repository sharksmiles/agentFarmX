import { prisma } from '@/lib/prisma';

// 游戏常量配置
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

// 获取系统配置（带缓存逻辑的设想，目前直接读库）
export async function getSystemConfig(key: string, defaultValue: any, tx?: any): Promise<any> {
  try {
    const client = tx || prisma;
    const config = await client.systemConfig.findUnique({
      where: { key },
    });
    return config?.value ?? defaultValue;
  } catch (error) {
    console.error(`[GameLogic] Error fetching config for ${key}:`, error);
    return defaultValue;
  }
}

// 统一能量恢复计算逻辑
export function calculateRecoveredEnergy(params: {
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

// 获取作物配置
export async function getCropConfig(cropType: string, tx?: any) {
  const client = tx || prisma;
  return await client.cropConfig.findUnique({
    where: { cropType },
  });
}

// 经验与等级计算
export async function processExpGain(tx: any, userId: string, gainedExp: number) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { level: true, experience: true }
  });

  if (!user) throw new Error('User not found');

  let newLevel = user.level;
  let totalExp = user.experience + gainedExp;

  // 简单循环检查升级，实际应优化为查询 LevelConfig
  const nextLevelConfig = await tx.levelConfig.findUnique({
    where: { level: newLevel + 1 }
  });

  if (nextLevelConfig && totalExp >= nextLevelConfig.requiredExp) {
    newLevel += 1;
    // 可以在此处添加升级奖励逻辑
  }

  return await tx.user.update({
    where: { id: userId },
    data: {
      experience: totalExp,
      level: newLevel
    }
  });
}
