import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 7天签到奖励配置
const DAILY_REWARDS = [100, 200, 300, 400, 500, 600, 1000];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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

    // 返回前端期望的格式：数字数组
    const daily_reward = DAILY_REWARDS;

    return NextResponse.json({
      total_days_checked_in: streak,
      can_check_in_today: canCheckInToday,
      daily_reward,
    });
  } catch (error) {
    console.error('GET /api/tasks/daily error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
