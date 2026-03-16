import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { AICostService } from './aiCostService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AgentErrorCode = 'NOT_FOUND' | 'INACTIVE' | 'LLM_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR';

export interface AgentDecisionResponse {
  success: boolean;
  decision?: any;
  error?: string | Error;
  errorCode?: AgentErrorCode;
}

export class AgentService {
  /**
   * 触发 Agent 决策逻辑
   */
  static async triggerDecision(agentId: string): Promise<AgentDecisionResponse> {
    let agent: any = null;
    try {
      // 1. 获取 Agent 及其关联数据
      agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          include: {
            farmState: {
              include: {
                landPlots: true,
              },
            },
            inventory: true,
          },
        },
      },
    });

    if (!agent) {
      return { success: false, error: 'Agent not found', errorCode: 'NOT_FOUND' };
    }

    if (!agent.isActive) {
      return { success: false, error: 'Agent is inactive', errorCode: 'INACTIVE' };
    }

    // 2. 获取可用技能
    const skills = await prisma.agentSkill.findMany({
      where: { isActive: true },
    });

    // 3. 构建上下文
    const context = {
      farmState: agent.user.farmState,
      inventory: agent.user.inventory,
      coins: agent.user.farmCoins,
      energy: agent.user.farmState?.energy || 0,
    };

    // 4. 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(agent, context);

    // 4.5 检查配额
    const estimatedTokens = 2000; // 估算值
    const quotaCheck = await AICostService.checkQuota(agent.userId, estimatedTokens);
    if (!quotaCheck.allowed) {
      return { 
        success: false, 
        error: quotaCheck.reason || 'Token quota exceeded', 
        errorCode: 'QUOTA_EXCEEDED' as any 
      };
    }

    // 5. 调用 LLM
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
        model: agent.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: agent.customPrompt || 'Analyze the current situation and decide what actions to take.',
          },
        ],
        functions: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          parameters: skill.parameters as any,
        })),
        function_call: 'auto',
        temperature: agent.temperature,
      });
      const latency = Date.now() - startTime;

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No choices returned from OpenAI');
      }

      const message = completion.choices[0].message;
      if (!message) {
        throw new Error('No message returned from OpenAI');
      }

      const tokensUsed = completion.usage?.total_tokens || 0;
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const cost = AICostService.calculateCost('openai', agent.aiModel, promptTokens, completionTokens);

      // 5.5 记录token使用
      await AICostService.recordUsage({
        userId: agent.userId,
        agentId: agent.id,
        provider: 'openai',
        model: agent.aiModel,
        promptTokens,
        completionTokens,
        totalTokens: tokensUsed,
        requestType: 'decision',
        cost,
      });

      // 6. 解析决策
      let decisions: any[] = [];
      let reasoning = '';

      if (message.function_call) {
        try {
          decisions = [{
            skillName: message.function_call.name,
            parameters: message.function_call.arguments ? JSON.parse(message.function_call.arguments) : {},
          }];
        } catch (e) {
          console.error('[AgentService] Error parsing function_call arguments:', e);
        }
      }

      if (message.content) {
        reasoning = message.content;
        try {
          const parsed = JSON.parse(message.content);
          if (Array.isArray(parsed)) {
            decisions = parsed;
          }
        } catch (e) {
          // Content is not JSON, might be reasoning
        }
      }

      if (decisions.length === 0 && !reasoning) {
        return { success: false, error: 'Empty decision from LLM', errorCode: 'INVALID_RESPONSE' };
      }

      // 7. 保存决策
      const decision = await prisma.agentDecision.create({
        data: {
          agentId: agent.id,
          model: agent.aiModel,
          prompt: systemPrompt,
          response: JSON.stringify(message),
          decisions,
          reasoning,
          tokensUsed,
          cost,
          latency,
          executed: false,
          success: false,
        },
      });

      // 8. 记录日志并更新活跃时间
      await prisma.$transaction([
        prisma.agentLog.create({
          data: {
            agentId: agent.id,
            level: 'info',
            message: `AI decision made: ${decisions.length} actions planned`,
            metadata: { decisionId: decision.id, tokensUsed, cost },
          },
        }),
        prisma.agent.update({
          where: { id: agent.id },
          data: { lastActiveAt: new Date(), status: 'running' }
        })
      ]);

      return { success: true, decision };
    } catch (error) {
      console.error(`[AgentService] Error triggering decision for ${agentId}:`, error);
      
      if (agent) {
        await prisma.agentLog.create({
          data: {
            agentId: agent.id,
            level: 'error',
            message: `AI decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        });
      }

      return { success: false, error: error instanceof Error ? error : String(error), errorCode: 'LLM_ERROR' };
    }
  }

  private static buildSystemPrompt(agent: any, context: any): string {
    return `You are an AI agent named "${agent.name}" with ${agent.personality} personality and ${agent.strategyType} strategy.

Current Farm State:
- Energy: ${context.energy}/${context.farmState?.maxEnergy || 100}
- Coins: ${context.coins}
- Unlocked Lands: ${context.farmState?.unlockedLands || 0}

Land Plots:
${context.farmState?.landPlots.map((plot: any, i: number) => 
  `Plot ${i}: ${plot.cropId ? `Growing ${plot.cropId} (stage ${plot.growthStage})` : 'Empty'}`
).join('\n')}

Inventory:
${context.inventory.map((item: any) => `${item.itemId}: ${item.quantity}`).join('\n')}

Your goal is to maximize farm profit while managing energy efficiently. Analyze the situation and decide which actions to take.
Return a JSON array of skill calls in order of execution.`;
  }

  private static calculateCost(model: string, tokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
    };

    const price = pricing[model] || pricing['gpt-3.5-turbo'];
    return ((tokens / 2) * price.input + (tokens / 2) * price.output) / 1000;
  }
}
