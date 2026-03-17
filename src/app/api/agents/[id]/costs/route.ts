import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents/[id]/costs - Get agent cost statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get decisions within date range
    const decisions = await prisma.agentDecision.findMany({
      where: {
        agentId: params.id,
        createdAt: { gte: startDate },
      },
      select: {
        cost: true,
        tokensUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDecisions = decisions.filter(
      (d) => d.createdAt >= today
    );

    const stats = {
      todayCost: todayDecisions.reduce((sum, d) => sum + d.cost, 0),
      weekCost: decisions.reduce((sum, d) => sum + d.cost, 0),
      avgDailyCost: decisions.reduce((sum, d) => sum + d.cost, 0) / days,
      todayTokens: todayDecisions.reduce((sum, d) => sum + d.tokensUsed, 0),
      weekTokens: decisions.reduce((sum, d) => sum + d.tokensUsed, 0),
    };

    // Group by day for trend
    const dailyCosts = decisions.reduce((acc: any, d) => {
      const date = d.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { cost: 0, tokens: 0, count: 0 };
      }
      acc[date].cost += d.cost;
      acc[date].tokens += d.tokensUsed;
      acc[date].count += 1;
      return acc;
    }, {});

    const trend = Object.entries(dailyCosts).map(([date, data]: [string, any]) => ({
      date,
      cost: data.cost,
      tokens: data.tokens,
      count: data.count,
    }));

    return NextResponse.json({ stats, trend });
  } catch (error) {
    console.error('GET /api/agents/[id]/costs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
