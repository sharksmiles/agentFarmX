import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents/[id]/skills - Get agent's skill usage history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [usages, total] = await Promise.all([
      prisma.agentSkillUsage.findMany({
        where: { agentId: params.id },
        include: {
          skill: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.agentSkillUsage.count({
        where: { agentId: params.id },
      }),
    ]);

    // Calculate statistics
    const stats = {
      totalUsages: total,
      successCount: usages.filter((u) => u.success).length,
      failureCount: usages.filter((u) => !u.success).length,
      avgExecutionTime:
        usages.reduce((sum, u) => sum + u.executionTime, 0) / usages.length || 0,
    };

    return NextResponse.json({ usages, total, stats });
  } catch (error) {
    console.error('GET /api/agents/[id]/skills error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
