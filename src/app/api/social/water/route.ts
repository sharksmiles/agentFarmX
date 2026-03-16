import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

const WATER_REWARD = 5; // 帮助好友浇水的金币奖励
const WATER_BOOST = 1.05; // 5% 的收益加成
const DEFAULT_WATERING_INTERVAL = 60; // 默认浇水间隔（分钟）

/**
 * POST /api/social/water - 帮好友浇水
 * 需要认证：验证用户身份
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { friendId, plotIndex } = body;
    const userId = context.auth.userId;

    if (!friendId || plotIndex === undefined) {
      return errorResponse('friendId and plotIndex are required', 400);
    }

    // 验证不能给自己浇水
    if (friendId === userId) {
      return errorResponse('Cannot water your own crops for reward', 400);
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

      // 3. 获取作物配置以确定浇水间隔
      const cropConfig = await tx.cropConfig.findUnique({
        where: { cropType: plot.cropId },
      });
      const wateringInterval = cropConfig?.wateringPeriod || DEFAULT_WATERING_INTERVAL;

      // 4. 计算下次浇水时间
      const now = new Date();
      const nextWateringDue = new Date(now.getTime() + wateringInterval * 60 * 1000);

      // 5. 执行浇水操作并给奖励
      const updatedPlot = await tx.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST,
          lastWateredAt: now,
          nextWateringDue: nextWateringDue,
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
});
