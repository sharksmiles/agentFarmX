import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Agent路由参数类型
 */
type AgentParams = { id: string };

/**
 * GET /api/agents/[id]/decisions - Get agent's decision history
 * 需要认证：验证Agent所有权
 */
export const GET = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    // 验证Agent所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this agent' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [decisions, total] = await Promise.all([
      prisma.agentDecision.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.agentDecision.count({
        where: { agentId },
      }),
    ]);

    // Calculate statistics
    const allDecisions = await prisma.agentDecision.findMany({
      where: { agentId },
      select: {
        tokensUsed: true,
        cost: true,
        latency: true,
        executed: true,
        success: true,
      },
    });

    const stats = {
      totalDecisions: total,
      executedCount: allDecisions.filter((d) => d.executed).length,
      successCount: allDecisions.filter((d) => d.success).length,
      totalTokens: allDecisions.reduce((sum, d) => sum + d.tokensUsed, 0),
      totalCost: allDecisions.reduce((sum, d) => sum + d.cost, 0),
      avgLatency:
        allDecisions.reduce((sum, d) => sum + d.latency, 0) / allDecisions.length || 0,
    };

    return NextResponse.json({ decisions, total, stats });
  } catch (error) {
    console.error('GET /api/agents/[id]/decisions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
