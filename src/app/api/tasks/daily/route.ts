import { NextRequest } from 'next/server';
import { errorResponse, internalErrorResponse, successResponse } from '@/utils/api/response';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// 7天签到奖励配置
const DAILY_REWARDS = [100, 200, 300, 400, 500, 600, 1000];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return errorResponse('userId is required', 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return errorResponse('User not found', 404);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const checkInKey = `daily_checkin_${userId}`;

    // 获取签到记录
    const checkInConfig = await prisma.systemConfig.findUnique({
      where: { key: checkInKey },
    });

    const lastCheckIn = checkInConfig?.value as any;
    const lastCheckInDate = lastCheckIn?.date;
    const streak = lastCheckIn?.streak || 0;

    // 判断今天是否可以签到
    const canCheckInToday = lastCheckInDate !== todayStr;

    // 当前7天周期中已完成的天数 (0-7)
    const daysInCurrentCycle = streak % 7 === 0 && streak > 0 ? 7 : streak % 7;
    // 已完成的天数索引数组 [0, 1, 2, ...]
    const checkedDays = Array.from({ length: daysInCurrentCycle }, (_, i) => i);
    // 当前应领取的奖励是第几天（1-7）
    const nextRewardDay = canCheckInToday ? daysInCurrentCycle + 1 : daysInCurrentCycle;

    return successResponse({
      total_days_checked_in: streak,
      days_in_current_cycle: daysInCurrentCycle,
      checked_days: checkedDays,
      next_reward_day: Math.min(nextRewardDay, 7),
      can_check_in_today: canCheckInToday,
      daily_reward: DAILY_REWARDS,
    });
  } catch (error) {
    console.error('GET /api/tasks/daily error:', error);
    return internalErrorResponse(error);
  }
}
