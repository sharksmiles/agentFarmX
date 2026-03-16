import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

const BOOST_MULTIPLIER = 2.0;
const BOOST_DURATION = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex } = body;

    if (!userId || plotIndex === undefined) {
      return errorResponse('userId and plotIndex are required', 400);
    }

    console.log('[Boost API] Request:', { userId, plotIndex });

    const now = new Date();

    // 在单个事务中执行加速逻辑
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. 获取用户及其农场状态
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { farmState: { include: { landPlots: true } }, inventory: true },
      });

      if (!user || !user.farmState) throw new Error('User or farm state not found');

      // 2. 获取并校验地块
      const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
      const plot = user.farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);

      console.log('[Boost API] Plot lookup:', { 
        dbPlotIndex, 
        foundPlot: plot ? { id: plot.id, plotIndex: plot.plotIndex, cropId: plot.cropId } : null,
        allPlots: user.farmState.landPlots.map(p => ({ plotIndex: p.plotIndex, cropId: p.cropId }))
      });

      if (!plot) throw new Error('Plot not found');
      if (!plot.cropId) throw new Error('No crop to boost');
      
      // 检查作物是否已成熟
      if (plot.harvestAt && now >= plot.harvestAt) {
        throw new Error('Crop is already mature, harvest it instead');
      }

      // 3. 校验加速道具
      const boostItem = user.inventory.find(i => i.itemType === 'boost' && i.quantity > 0);
      if (!boostItem) throw new Error('No boost item available');

      // 4. 执行加速操作
      await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: BOOST_MULTIPLIER,
          boostExpireAt: new Date(now.getTime() + BOOST_DURATION),
        },
      });

      // 5. 扣除道具
      await tx.inventory.update({
        where: { id: boostItem.id },
        data: { quantity: { decrement: 1 } },
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

    if (!updatedUser) throw new Error('User data corruption after boost');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'User or farm state not found' || error.message === 'Plot not found') {
      return notFoundResponse(error.message);
    }
    if (error.message === 'No crop to boost' || error.message === 'No boost item available' || error.message === 'Crop is already mature, harvest it instead') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
