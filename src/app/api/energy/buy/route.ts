import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GameService, GAME_CONSTANTS } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

const ENERGY_PACKS: Record<string, { energy: number; cost: number; dailyLimit: number }> = {
  small: { energy: 10, cost: 500, dailyLimit: 10 },
  large: { energy: 50, cost: 2000, dailyLimit: 5 },
  full: { energy: 0, cost: 100, dailyLimit: 3 }, // 每点能量的成本
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pack } = body;

    if (!userId || !pack) {
      return errorResponse('userId and pack are required', 400);
    }

    const packInfo = ENERGY_PACKS[pack];
    if (!packInfo) {
      return errorResponse('Invalid pack type', 400);
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const purchaseKey = `energy_purchase_${userId}_${pack}_${todayStr}`;

    // 在单个事务中执行购买逻辑
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取用户状态并处理能量恢复
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: true },
      });

      if (!user || !user.farmState) throw new Error('User or farm state not found');

      const recoveryIntervalMins = await GameService.getEnergyRecoveryInterval(tx);

      const { newEnergy, newLastUpdate } = GameService.calculateRecoveredEnergy({
        currentEnergy: user.farmState.energy,
        maxEnergy: user.farmState.maxEnergy,
        lastUpdate: user.farmState.lastEnergyUpdate,
        recoveryIntervalMins: recoveryIntervalMins
      });

      // 2. 校验每日购买限制
      const purchaseRecord = await tx.systemConfig.findUnique({ where: { key: purchaseKey } });
      const purchaseCount = (purchaseRecord?.value as any)?.count || 0;

      if (purchaseCount >= packInfo.dailyLimit) {
        throw new Error('Daily purchase limit reached');
      }

      // 3. 计算实际成本与增加的能量
      let actualCost = packInfo.cost;
      let actualEnergy = packInfo.energy;

      if (pack === 'full') {
        const energyNeeded = Math.max(0, user.farmState.maxEnergy - newEnergy);
        actualCost = energyNeeded * 100;
        actualEnergy = energyNeeded;
      }

      if (actualEnergy <= 0) throw new Error('Energy is already full');
      if (user.farmCoins < actualCost) throw new Error('Insufficient coins');

      // 4. 执行扣款与增加能量
      const newBalance = user.farmCoins - actualCost;
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: actualCost } }
      });

      await tx.farmState.update({
        where: { id: user.farmState.id },
        data: {
          energy: Math.min(newEnergy + actualEnergy, user.farmState.maxEnergy),
          lastEnergyUpdate: newEnergy + actualEnergy >= user.farmState.maxEnergy ? now : newLastUpdate,
        },
      });

      // 5. 记录交易与购买次数
      await tx.transaction.create({
        data: {
          userId,
          type: 'spend',
          category: 'energy',
          amount: actualCost,
          balance: newBalance,
          description: `Bought ${pack} energy pack (+${actualEnergy} energy)`,
        },
      });

      await tx.systemConfig.upsert({
        where: { key: purchaseKey },
        create: {
          key: purchaseKey,
          value: { count: 1, lastPurchase: now.toISOString() },
        },
        update: {
          value: { count: purchaseCount + 1, lastPurchase: now.toISOString() },
        },
      });

      // 6. 返回最新数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    });

    if (!updatedUser) throw new Error('User data corruption after energy purchase');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'User or farm state not found') return notFoundResponse(error.message);
    if (error.message === 'Daily purchase limit reached') return errorResponse(error.message, 429);
    if (error.message === 'Insufficient coins' || error.message === 'Energy is already full') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
