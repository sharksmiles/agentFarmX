import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const checkInKey = `daily_checkin_${userId}`;

    // 在单个事务中处理每日签到逻辑
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取签到记录
      const checkInConfig = await tx.systemConfig.findUnique({
        where: { key: checkInKey },
      });

      const lastCheckIn = checkInConfig?.value as any;
      const lastCheckInDate = lastCheckIn?.date;

      if (lastCheckInDate === todayStr) {
        throw new Error('Already checked in today');
      }

      // 2. 计算连续签到与奖励
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const isConsecutive = lastCheckInDate === yesterdayStr;
      const newStreak = isConsecutive ? (lastCheckIn?.streak || 0) + 1 : 1;
      const reward = Math.min(newStreak * 10, 100); // 阶梯奖励，上限 100

      // 3. 更新签到状态与发放奖励
      await tx.systemConfig.upsert({
        where: { key: checkInKey },
        create: {
          key: checkInKey,
          value: { date: todayStr, streak: newStreak },
        },
        update: {
          value: { date: todayStr, streak: newStreak },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { increment: reward } },
      });

      return { streak: newStreak, reward, user: updatedUser };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Already checked in today') return errorResponse(error.message, 400);
    return internalErrorResponse(error);
  }
}
