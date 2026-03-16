import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

const WATER_REWARD = 5; // 帮助好友浇水的金币奖励
const WATER_BOOST = 1.05; // 5% 的收益加成

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId, plotIndex } = body;

    if (!userId || !friendId || plotIndex === undefined) {
      return errorResponse('userId, friendId, and plotIndex are required', 400);
    }

    // 在单个事务中处理帮好友浇水逻辑
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取好友农场状态
      const friendFarm = await tx.farmState.findUnique({
        where: { userId: friendId },
        include: { landPlots: true },
      });

      if (!friendFarm) throw new Error('Friend farm not found');

      // 2. 获取并校验地块
      const plot = friendFarm.landPlots.find((p) => p.plotIndex === plotIndex);
      if (!plot || !plot.cropId) throw new Error('No crop to water');

      // 3. 执行浇水操作并给奖励
      const updatedPlot = await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST,
        },
      });

      const socialAction = await tx.socialAction.create({
        data: {
          fromUserId: userId,
          toUserId: friendId,
          actionType: 'water',
          metadata: { plotIndex, reward: WATER_REWARD, cropId: plot.cropId },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { increment: WATER_REWARD } },
      });

      return { plot: updatedPlot, reward: WATER_REWARD, user: updatedUser, action: socialAction };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Friend farm not found') return notFoundResponse(error.message);
    if (error.message === 'No crop to water') return errorResponse(error.message, 400);
    return internalErrorResponse(error);
  }
}
