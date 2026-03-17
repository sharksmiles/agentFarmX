import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentService } from '@/services/agentService';
import { AgentExecutor } from '@/services/agentExecutor';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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
    let decisionCount = 0;
    let executionCount = 0;

    // Process agents one by one to avoid overwhelming LLM API and timeouts
    for (const agent of activeAgents) {
      console.log(`[Agent Tick] Ticking agent: ${agent.name} (${agent.id})`);
      
      try {
        // 1. 触发 AI 决策
        const result = await AgentService.triggerDecision(agent.id);
        
        processedCount++;
        
        if (result.success && result.decision) {
          decisionCount++;
          console.log(`[Agent Tick] Agent ${agent.name} decision made, executing...`);
          
          // 2. 执行决策
          try {
            await AgentExecutor.executeDecision(result.decision);
            executionCount++;
            console.log(`[Agent Tick] Agent ${agent.name} decision executed successfully`);
          } catch (execError) {
            console.error(`[Agent Tick] Agent ${agent.name} execution failed:`, execError);
          }
        } else {
          console.log(`[Agent Tick] Agent ${agent.name} decision failed:`, result.error);
        }
      } catch (agentError) {
        console.error(`[Agent Tick] Agent ${agent.name} error:`, agentError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Agent Tick] Completed in ${duration}ms. Processed: ${processedCount}, Decisions: ${decisionCount}, Executed: ${executionCount}`
    );

    return NextResponse.json({
      success: true,
      processedCount,
      decisionCount,
      executionCount,
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
