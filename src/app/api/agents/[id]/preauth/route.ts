/**
 * Agent Pre-authorization API
 * 
 * GET  - 获取预授权状态
 * POST - 请求预授权（返回402）
 * DELETE - 撤销预授权
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import { preauthRequiredResponse } from '@/utils/api/response';

export const dynamic = 'force-dynamic';

type AgentParams = { id: string };

/**
 * GET /api/agents/[id]/preauth - 获取预授权状态
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
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 查找有效的预授权
    const validAuth = await prisma.agentPaymentAuth.findFirst({
      where: {
        agentId,
        isActive: true,
        validBefore: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validAuth) {
      return NextResponse.json({
        hasValidAuth: false,
        auth: null,
        needsNewAuth: true,
      });
    }

    // 计算剩余额度
    const remaining = validAuth.authorizedValue - validAuth.usedValue;
    const daysRemaining = Math.ceil(
      (validAuth.validBefore.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      hasValidAuth: true,
      auth: {
        id: validAuth.id,
        authorizedValue: validAuth.authorizedValue.toString(),
        usedValue: validAuth.usedValue.toString(),
        remainingValue: remaining.toString(),
        validBefore: validAuth.validBefore.toISOString(),
        daysRemaining,
      },
      needsNewAuth: remaining <= BigInt(0) || daysRemaining <= 3,
    });
  } catch (error) {
    console.error('GET /api/agents/[id]/preauth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * POST /api/agents/[id]/preauth - 请求预授权（返回402）
 */
export const POST = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const body = await request.json().catch(() => ({}));
    const amountUsdc = body.amountUsdc || 10; // 默认预授权10 USDC

    // 验证Agent所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 检查是否已有有效预授权
    const existingAuth = await prisma.agentPaymentAuth.findFirst({
      where: {
        agentId,
        isActive: true,
        validBefore: { gt: new Date() },
      },
    });

    if (existingAuth) {
      const remaining = existingAuth.authorizedValue - existingAuth.usedValue;
      if (remaining > BigInt(0)) {
        return NextResponse.json({
          error: 'Valid pre-authorization already exists',
          existingAuth: {
            id: existingAuth.id,
            remainingValue: remaining.toString(),
          },
        }, { status: 400 });
      }
    }

    // 返回402，要求预授权签名
    return preauthRequiredResponse(agentId, amountUsdc);
  } catch (error) {
    console.error('POST /api/agents/[id]/preauth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/agents/[id]/preauth - 撤销预授权
 */
export const DELETE = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('authId');

    if (!authId) {
      return NextResponse.json({ error: 'authId is required' }, { status: 400 });
    }

    // 验证Agent所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 撤销预授权
    const updated = await prisma.agentPaymentAuth.update({
      where: { id: authId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pre-authorization revoked',
      auth: {
        id: updated.id,
        revokedAt: updated.revokedAt,
      },
    });
  } catch (error) {
    console.error('DELETE /api/agents/[id]/preauth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
