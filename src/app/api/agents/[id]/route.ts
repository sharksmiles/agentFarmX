import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * Agent路由参数类型
 */
type AgentParams = { id: string };

/**
 * GET /api/agents/[id] - Get agent details
 * 需要认证：验证Agent所有权
 */
export const GET = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
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

    // 验证所有权
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this agent' },
        { status: 403 }
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
});

/**
 * PATCH /api/agents/[id] - Update agent
 * 需要认证：验证Agent所有权
 */
export const PATCH = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    // 先验证所有权
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (existingAgent.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this agent' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, personality, strategyType, aiModel, customPrompt, temperature } = body;

    const agent = await prisma.agent.update({
      where: { id: agentId },
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
});

/**
 * DELETE /api/agents/[id] - Delete agent
 * 需要认证：验证Agent所有权
 */
export const DELETE = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    // 先验证所有权
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (existingAgent.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this agent' },
        { status: 403 }
      );
    }

    await prisma.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
