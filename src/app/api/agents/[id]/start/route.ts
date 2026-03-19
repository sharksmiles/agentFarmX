import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import { preauthRequiredResponse } from '@/utils/api/response';
import { AgentService } from '@/services/agentService';
import { AgentExecutor } from '@/services/agentExecutor';

/**
 * Agent路由参数类型
 */
type AgentParams = { id: string };

/**
 * POST /api/agents/[id]/start - Start agent
 * 需要认证：验证Agent所有权
 */
export const POST = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
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

    if (agent.status === 'running') {
      return NextResponse.json(
        { error: 'Agent is already running' },
        { status: 400 }
      );
    }

    // 检查Agent是否有付费Skill需要预授权
    const paidSkills = await prisma.agentSkill.findMany({
      where: {
        priceUsdc: { gt: 0 },
        isActive: true,
      },
    });

    // 如果有付费Skill，检查预授权状态
    if (paidSkills.length > 0) {
      const validAuth = await prisma.agentPaymentAuth.findFirst({
        where: {
          agentId,
          isActive: true,
          validBefore: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 无有效预授权或额度不足，返回402
      if (!validAuth) {
        return preauthRequiredResponse(agentId, 10);
      }

      const remaining = validAuth.authorizedValue - validAuth.usedValue;
      const minRequired = BigInt(Math.floor(0.001 * 1e6)); // 最低需要 0.001 USDC
      
      if (remaining < minRequired) {
        // 额度不足，需要重新预授权
        return preauthRequiredResponse(agentId, 10);
      }
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'running',
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    // Create log
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message: 'Agent started',
      },
    });

    // 立即触发一次决策执行（异步，不阻塞响应）
    setImmediate(async () => {
      try {
        console.log(`[Agent Start] Triggering first decision for agent ${agentId}`);
        
        // 1. 触发 AI 决策
        const result = await AgentService.triggerDecision(agentId);
        
        if (result.success && result.decision) {
          console.log(`[Agent Start] Decision made, executing...`);
          
          // 2. 执行决策
          await AgentExecutor.executeDecision(result.decision);
          console.log(`[Agent Start] Decision executed successfully`);
        } else {
          console.log(`[Agent Start] Decision failed:`, result.error);
        }
      } catch (error) {
        console.error(`[Agent Start] Error executing initial decision:`, error);
      }
    });

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('POST /api/agents/[id]/start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
