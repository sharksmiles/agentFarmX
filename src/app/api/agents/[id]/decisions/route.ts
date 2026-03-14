import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents/[id]/decisions - Get agent's decision history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [decisions, total] = await Promise.all([
      prisma.agentDecision.findMany({
        where: { agentId: params.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.agentDecision.count({
        where: { agentId: params.id },
      }),
    ]);

    // Calculate statistics
    const allDecisions = await prisma.agentDecision.findMany({
      where: { agentId: params.id },
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
}
