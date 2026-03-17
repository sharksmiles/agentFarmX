import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// 解锁地块的硬编码成本（建议后续移至 LevelConfig 或 SystemConfig）
const LAND_UNLOCK_COSTS: Record<number, number> = {
  6: 500,   // 第7块地 (索引6)
  7: 1000,  // 第8块地 (索引7)
  8: 2000,  // 第9块地 (索引8)
  9: 5000,  // 第10块地 (索引9)
  10: 10000, 
  11: 20000, 
};

/**
 * POST /api/farm/unlock - 解锁地块
 * 需要认证：从Token中获取用户ID
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { plotIndex } = body;
    const userId = context.auth.userId; // 从认证上下文获取用户ID

    if (plotIndex === undefined) {
      return errorResponse('plotIndex is required', 400);
    }

    // 在单个事务中执行解锁逻辑
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取用户及其农场状态
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: { include: { landPlots: true } } },
      });

      if (!user || !user.farmState) throw new Error('User or Farm state not found');

      // 2. 索引转换与成本校验
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const cost = LAND_UNLOCK_COSTS[dbPlotIndex];
      
      if (cost === undefined) throw new Error('Invalid plot index or not unlockable');
      if (user.farmCoins < cost) throw new Error('Insufficient coins');

      // 3. 校验是否已解锁
      const existingPlot = user.farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);
      if (existingPlot && existingPlot.isUnlocked) throw new Error('Plot already unlocked');

      // 4. 执行解锁操作
      await tx.landPlot.upsert({
        where: {
          farmStateId_plotIndex: {
            farmStateId: user.farmState.id,
            plotIndex: dbPlotIndex
          }
        },
        create: {
          farmStateId: user.farmState.id,
          plotIndex: dbPlotIndex,
          isUnlocked: true,
          growthStage: 0,
        },
        update: { isUnlocked: true }
      });

      // 5. 扣除金币并更新农场状态
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: cost } }
      });

      await tx.farmState.update({
        where: { id: user.farmState.id },
        data: { unlockedLands: { increment: 1 } }
      });

      // 6. 返回最新用户数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    });

    if (!updatedUser) throw new Error('User data corruption after unlocking plot');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'User or Farm state not found') return notFoundResponse(error.message);
    if (error.message === 'Insufficient coins' || error.message === 'Plot already unlocked' || error.message === 'Invalid plot index or not unlockable') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
});
