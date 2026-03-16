import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentService } from '@/services/agentService';

export const maxDuration = 300; // Agent ticks can take a while due to LLM calls

export async function GET(request: NextRequest) {
  try {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Agent Tick] Starting...');

    // Find active agents
    const activeAgents = await prisma.agent.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`[Agent Tick] Found ${activeAgents.length} active agents to tick`);

    let processedCount = 0;
    let successCount = 0;

    // Process agents one by one to avoid overwhelming LLM API and timeouts
    // In a real production environment, this should be handled by a queue
    for (const agent of activeAgents) {
      console.log(`[Agent Tick] Ticking agent: ${agent.name} (${agent.id})`);
      const result = await AgentService.triggerDecision(agent.id);
      
      processedCount++;
      if (result.success) {
        successCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Agent Tick] Completed in ${duration}ms. Processed ${processedCount} agents, ${successCount} successful`
    );

    return NextResponse.json({
      success: true,
      processedCount,
      successCount,
      duration,
    });
  } catch (error) {
    console.error('[Agent Tick] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
