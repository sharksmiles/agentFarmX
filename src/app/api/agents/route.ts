import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents - Get all agents for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const agents = await prisma.agent.findMany({
      where: { userId },
      include: {
        tasks: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      scaAddress,
      name,
      personality = 'balanced',
      strategyType = 'farming',
      aiModel = 'gpt-3.5-turbo',
      customPrompt,
      temperature = 0.7,
    } = body;

    if (!userId || !scaAddress || !name) {
      return NextResponse.json(
        { error: 'userId, scaAddress, and name are required' },
        { status: 400 }
      );
    }

    // Check if SCA address already exists
    const existing = await prisma.agent.findUnique({
      where: { scaAddress: scaAddress.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Agent with this SCA address already exists' },
        { status: 409 }
      );
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        userId,
        scaAddress: scaAddress.toLowerCase(),
        name,
        personality,
        strategyType,
        aiModel,
        customPrompt,
        temperature,
        status: 'idle',
        isActive: false,
      },
      include: {
        tasks: true,
        logs: true,
      },
    });

    // Create initial log
    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        level: 'info',
        message: `Agent "${name}" created successfully`,
        metadata: {
          personality,
          strategyType,
          aiModel,
        },
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
