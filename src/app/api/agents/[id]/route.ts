import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents/[id] - Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        logs: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
        skillUsages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            skill: true,
          },
        },
        decisions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, personality, strategyType, aiModel, customPrompt, temperature } = body;

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(personality && { personality }),
        ...(strategyType && { strategyType }),
        ...(aiModel && { aiModel }),
        ...(customPrompt !== undefined && { customPrompt }),
        ...(temperature !== undefined && { temperature }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('PATCH /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.agent.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
