import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents/[id]/settings - Get agent settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: {
        aiModel: true,
        customPrompt: true,
        temperature: true,
        personality: true,
        strategyType: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('GET /api/agents/[id]/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id]/settings - Update agent settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { aiModel, customPrompt, temperature, personality, strategyType } = body;

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        ...(aiModel && { aiModel }),
        ...(customPrompt !== undefined && { customPrompt }),
        ...(temperature !== undefined && { temperature }),
        ...(personality && { personality }),
        ...(strategyType && { strategyType }),
      },
      select: {
        aiModel: true,
        customPrompt: true,
        temperature: true,
        personality: true,
        strategyType: true,
      },
    });

    // Create log
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'info',
        message: 'Agent settings updated',
        metadata: body,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error('PATCH /api/agents/[id]/settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
