import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Daily Reset] Starting...');

    // Reset daily statistics
    // This is a placeholder - customize based on your game mechanics

    // Example: Reset daily social action limits
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Clean up old logs (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deletedLogs = await prisma.agentLog.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        level: 'info', // Only delete info logs, keep warnings and errors
      },
    });

    // Clean up old completed tasks (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedTasks = await prisma.agentTask.deleteMany({
      where: {
        status: 'completed',
        completedAt: { lt: thirtyDaysAgo },
      },
    });

    const duration = Date.now() - startTime;
    console.log(
      `[Daily Reset] Completed in ${duration}ms. Deleted ${deletedLogs.count} logs, ${deletedTasks.count} tasks`
    );

    return NextResponse.json({
      success: true,
      deletedLogs: deletedLogs.count,
      deletedTasks: deletedTasks.count,
      duration,
    });
  } catch (error) {
    console.error('[Daily Reset] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
