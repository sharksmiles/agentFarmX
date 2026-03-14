import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Get user's last check-in
    const checkInConfig = await prisma.systemConfig.findUnique({
      where: { key: `daily_checkin_${userId}` },
    });

    const lastCheckIn = checkInConfig?.value as any;
    const lastCheckInDate = lastCheckIn?.date;

    if (lastCheckInDate === today) {
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 400 }
      );
    }

    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const isConsecutive = lastCheckInDate === yesterdayStr;
    const newStreak = isConsecutive ? (lastCheckIn?.streak || 0) + 1 : 1;
    const reward = newStreak * 10; // Increasing reward based on streak

    // Update check-in
    const [updatedConfig, updatedUser] = await prisma.$transaction([
      prisma.systemConfig.upsert({
        where: { key: `daily_checkin_${userId}` },
        create: {
          key: `daily_checkin_${userId}`,
          value: {
            date: today,
            streak: newStreak,
          },
        },
        update: {
          value: {
            date: today,
            streak: newStreak,
          },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: reward },
        },
      }),
    ]);

    return NextResponse.json({
      streak: newStreak,
      reward,
      user: updatedUser,
    });
  } catch (error) {
    console.error('POST /api/tasks/daily/claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
