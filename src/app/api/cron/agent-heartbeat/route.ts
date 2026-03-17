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
    console.log('[Agent Heartbeat] Starting...');

    const now = new Date();
    // Only mark agents as error if they haven't been active for 30 minutes
    // This gives enough time for agent-tick to run (every 5 minutes)
    const TIMEOUT_MINUTES = 30;

    // Find running agents that haven't been active for a long time
    const timeoutThreshold = new Date(now.getTime() - TIMEOUT_MINUTES * 60000);

    const staleAgents = await prisma.agent.findMany({
      where: {
        status: 'running',
        isActive: true,
        lastActiveAt: { lt: timeoutThreshold },
      },
      select: {
        id: true,
        name: true,
        lastActiveAt: true,
      },
    });

    console.log(`[Agent Heartbeat] Found ${staleAgents.length} stale agents (inactive > ${TIMEOUT_MINUTES}min)`);

    let updatedCount = 0;

    // Mark stale agents as error status
    for (const agent of staleAgents) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'error',
          isActive: false,
        },
      });

      // Create error log
      await prisma.agentLog.create({
        data: {
          agentId: agent.id,
          level: 'error',
          message: 'Agent heartbeat timeout - marked as error',
          metadata: {
            lastActiveAt: agent.lastActiveAt,
            timeoutMinutes: TIMEOUT_MINUTES,
          },
        },
      });

      updatedCount++;
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Agent Heartbeat] Completed in ${duration}ms. Updated ${updatedCount} agents`
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      duration,
    });
  } catch (error) {
    console.error('[Agent Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
