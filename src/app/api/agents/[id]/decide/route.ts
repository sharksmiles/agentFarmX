import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/services/agentService';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * Agent路由参数类型
 */
type AgentParams = { id: string };

/**
 * POST /api/agents/[id]/decide - Trigger AI decision
 * 需要认证：验证Agent所有权
 */
export const POST = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    // 验证Agent所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this agent' },
        { status: 403 }
      );
    }

    const result = await AgentService.triggerDecision(agentId);

    if (!result.success || !result.decision) {
      const errorMessage = result.error instanceof Error 
        ? result.error.message 
        : (result.error || 'Failed to make decision');
      
      // 记录错误日志到数据库
      await prisma.agentLog.create({
        data: {
          agentId: agentId,
          level: 'error',
          message: `API decision failed: ${errorMessage}`,
        },
      });
        
      return NextResponse.json(
        { 
          error: errorMessage,
          code: result.errorCode || 'UNKNOWN_ERROR'
        },
        { status: result.errorCode === 'NOT_FOUND' ? 404 : 400 }
      );
    }

    return NextResponse.json({ decision: result.decision });
  } catch (error) {
    console.error('POST /api/agents/[id]/decide error:', error);
    
    // 记录系统级别错误日志
    await prisma.agentLog.create({
      data: {
        agentId: context.params.id,
        level: 'error',
        message: `API decision system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    }).catch(e => console.error('Failed to log to database:', e));

    return NextResponse.json(
      { error: 'Failed to make decision' },
      { status: 500 }
    );
  }
});
