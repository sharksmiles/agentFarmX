import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { calculateRecoveredEnergy, getSystemConfig, GAME_CONSTANTS, processExpGain } from '@/utils/func/gameLogic';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

const WATER_ENERGY_COST = 1;
const WATER_BOOST_MULTIPLIER = 1.1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex } = body;

    if (!userId || plotIndex === undefined) {
      return errorResponse('userId and plotIndex are required', 400);
    }

    const now = new Date();

    // 1. 先在事务外获取必要的静态配置
    const recoveryInterval = await getSystemConfig('energy_recovery_rate', GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS);

    // 2. 在事务中处理浇水逻辑 (设置超时时间为 15秒)
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 获取农场状态并处理能量恢复
      const farmState = await tx.farmState.findUnique({
        where: { userId },
        include: { landPlots: true },
      });

      if (!farmState) throw new Error('Farm state not found');

      const { newEnergy, newLastUpdate } = calculateRecoveredEnergy({
        currentEnergy: farmState.energy,
        maxEnergy: farmState.maxEnergy,
        lastUpdate: farmState.lastEnergyUpdate,
        recoveryIntervalMins: recoveryInterval
      });

      // 校验能量
      if (newEnergy < WATER_ENERGY_COST) throw new Error('Insufficient energy');

      // 获取并校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);

      if (!plot) throw new Error('Plot not found');
      if (!plot.cropId) throw new Error('No crop to water');

      // 执行浇水操作 (增加收益倍率)
      await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST_MULTIPLIER,
          boostExpireAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour boost
          lastWateredAt: now,
          nextWateringDue: new Date(now.getTime() + 10 * 60 * 1000), // Next watering in 10 mins
        } as any,
      });

      // 增加少量经验
      await processExpGain(tx, userId, 2);

      // 更新农场状态 (扣除能量)
      await tx.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: { decrement: WATER_ENERGY_COST }, // 使用 increment/decrement 原子操作
          lastEnergyUpdate: newLastUpdate,
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
    }, {
      timeout: 15000 // 增加超时时间到 15 秒
    });

    if (!updatedUser) throw new Error('User data corruption after watering');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'Farm state not found' || error.message === 'Plot not found') {
      return notFoundResponse(error.message);
    }
    if (error.message === 'Insufficient energy' || error.message === 'No crop to water') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
