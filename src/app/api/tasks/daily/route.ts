import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get user's last check-in from SystemConfig
    const checkInConfig = await prisma.systemConfig.findUnique({
      where: { key: `daily_checkin_${userId}` },
    });

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = checkInConfig?.value as any;
    const lastCheckInDate = lastCheckIn?.date;

    const canCheckIn = lastCheckInDate !== today;
    const streak = lastCheckIn?.streak || 0;

    return NextResponse.json({
      canCheckIn,
      streak,
      lastCheckIn: lastCheckInDate,
      nextReward: (streak + 1) * 10, // Increasing reward
    });
  } catch (error) {
    console.error('GET /api/tasks/daily error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
