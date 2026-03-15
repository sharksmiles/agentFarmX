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

    // Get user's check-in history from metadata
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate check-in status (simplified - should track in DB)
    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = user.updatedAt.toISOString().split('T')[0];
    const canCheckInToday = today !== lastCheckIn;

    // Generate 7-day reward structure
    const daily_reward = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      reward: (i + 1) * 10, // 10, 20, 30, ... 70
      claimed: false, // Should track in DB
    }));

    return NextResponse.json({
      total_days_checked_in: 0, // Should track in DB
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
