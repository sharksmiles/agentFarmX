import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/agents/[id]/start - Start agent
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

    if (agent.status === 'running') {
      return NextResponse.json(
        { error: 'Agent is already running' },
        { status: 400 }
      );
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        status: 'running',
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    // Create log
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'info',
        message: 'Agent started',
      },
    });

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('POST /api/agents/[id]/start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
