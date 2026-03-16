import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// 升级配置的兜底逻辑 (建议优先使用数据库 LevelConfig)
const MAX_ENERGY_PER_LEVEL: Record<number, number> = {
  1: 100, 2: 120, 3: 150, 4: 200, 5: 250, 6: 300,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    // 在单个事务中执行升级逻辑
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取用户及其农场状态
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: true },
      });

      if (!user || !user.farmState) throw new Error('User or farm state not found');

      const currentLevel = user.level;
      const nextLevel = currentLevel + 1;

      // 2. 获取当前等级配置
      const currentLevelConfig = await tx.levelConfig.findUnique({
        where: { level: currentLevel }
      });

      if (!currentLevelConfig) throw new Error('Level configuration not found');

      // 3. 获取下一级配置，用于检查是否可以升级和计算新能量上限
      const nextLevelConfig = await tx.levelConfig.findUnique({
        where: { level: nextLevel }
      });

      // 如果没有下一级配置，说明已达到最大等级
      if (!nextLevelConfig) throw new Error('Max level reached');

      // 4. 校验经验值与金币
      if (user.experience < currentLevelConfig.requiredExp) {
        throw new Error(`Insufficient experience. Need ${currentLevelConfig.requiredExp} exp.`);
      }

      const cost = currentLevelConfig.upgradeCost;
      if (user.farmCoins < cost) throw new Error('Insufficient coins');

      // 5. 计算新的能量上限
      const newMaxEnergy = nextLevelConfig.maxLand * 10 + 40;

      // 6. 执行升级操作
      await tx.user.update({
        where: { id: userId },
        data: {
          level: nextLevel,
          farmCoins: { decrement: cost },
          experience: { decrement: currentLevelConfig.requiredExp }, // 扣除升级所需经验
        },
      });

      await tx.farmState.update({
        where: { id: user.farmState.id },
        data: {
          maxEnergy: newMaxEnergy,
          energy: newMaxEnergy, // 升级后自动补满能量
          lastEnergyUpdate: new Date()
        },
      });

      // 7. 返回最新用户数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        },
      });
    });

    if (!updatedUser) throw new Error('User data corruption after upgrade');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'User or farm state not found' || error.message === 'Level configuration not found') {
      return notFoundResponse(error.message);
    }
    if (error.message === 'Max level reached' || error.message.includes('Insufficient experience') || error.message === 'Insufficient coins') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
