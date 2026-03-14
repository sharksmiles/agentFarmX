import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/agents/[id]/stop - Stop agent
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        status: 'paused',
        isActive: false,
      },
    });

    // Create log
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'info',
        message: 'Agent stopped',
      },
    });

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('POST /api/agents/[id]/stop error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
