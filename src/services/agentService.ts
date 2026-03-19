import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { AICostService } from './aiCostService';

// 检查 OpenAI API Key 是否有效
const isOpenAIConfigured = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY.startsWith('sk-') && 
  process.env.OPENAI_API_KEY.length > 20;

const openai = isOpenAIConfigured ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// 模拟模式开关
const SIMULATION_MODE = !isOpenAIConfigured || process.env.AGENT_SIMULATION_MODE === 'true';

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

    // 5. 调用 LLM 或使用模拟模式
    const startTime = Date.now();
    let decisions: any[] = [];
    let reasoning = '';
    let tokensUsed = 0;
    let cost = 0;
    let latency = 0;

    if (SIMULATION_MODE || !openai) {
      // 模拟模式：使用规则引擎生成决策
      console.log(`[AgentService] Running in SIMULATION mode for agent ${agentId}`);
      const simulatedDecision = this.generateSimulatedDecision(agent, context, skills);
      decisions = simulatedDecision.decisions;
      reasoning = simulatedDecision.reasoning;
      latency = Date.now() - startTime;
      // 模拟模式不消耗 token 和成本
    } else {
      // 正常模式：调用 OpenAI API
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
      latency = Date.now() - startTime;

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No choices returned from OpenAI');
      }

      const message = completion.choices[0].message;
      if (!message) {
        throw new Error('No message returned from OpenAI');
      }

      tokensUsed = completion.usage?.total_tokens || 0;
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      cost = AICostService.calculateCost('openai', agent.aiModel, promptTokens, completionTokens);

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

      // 解析 LLM 响应
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
    }

      if (decisions.length === 0 && !reasoning) {
        return { success: false, error: 'Empty decision from LLM', errorCode: 'INVALID_RESPONSE' };
      }

      // 7. 保存决策
      const responseData = SIMULATION_MODE 
        ? JSON.stringify({ decisions, reasoning, mode: 'simulation' })
        : JSON.stringify({ decisions, reasoning, mode: 'llm' });
      
      const decision = await prisma.agentDecision.create({
        data: {
          agentId: agent.id,
          model: SIMULATION_MODE ? 'simulation' : agent.aiModel,
          prompt: systemPrompt,
          response: responseData,
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

  /**
   * 模拟模式：基于规则生成决策
   * 当 OpenAI API Key 无效或未配置时使用
   */
  private static generateSimulatedDecision(
    agent: any, 
    context: any, 
    skills: any[]
  ): { decisions: any[]; reasoning: string } {
    const decisions: any[] = [];
    const reasoningParts: string[] = [];
    
    // 获取农场状态
    const farmState = context.farmState;
    const landPlots = farmState?.landPlots || [];
    const energy = context.energy || 0;
    
    // 策略类型影响决策优先级
    const strategyType = agent.strategyType || 'balanced';
    
    // 1. 检查是否有可收获的作物
    const harvestablePlots = landPlots.filter((plot: any) => 
      plot.cropId && plot.growthStage >= 4
    );
    
    if (harvestablePlots.length > 0 && energy >= 10) {
      const plot = harvestablePlots[0];
      decisions.push({
        skillName: 'harvest_crop',
        parameters: { plotIndex: plot.plotIndex }
      });
      reasoningParts.push(`Harvesting crop from plot ${plot.plotIndex}`);
    }
    
    // 2. 检查是否有空地块可以种植
    const emptyPlots = landPlots.filter((plot: any) => !plot.cropId);
    
    if (emptyPlots.length > 0 && energy >= 15 && decisions.length === 0) {
      // 根据策略选择作物
      const cropId = strategyType === 'aggressive' ? 'corn' : 'wheat';
      decisions.push({
        skillName: 'plant_crop',
        parameters: { 
          plotIndex: emptyPlots[0].plotIndex,
          cropId 
        }
      });
      reasoningParts.push(`Planting ${cropId} on empty plot ${emptyPlots[0].plotIndex}`);
    }
    
    // 3. 检查能量状态
    if (energy < 30 && decisions.length === 0) {
      decisions.push({
        skillName: 'check_energy',
        parameters: {}
      });
      reasoningParts.push('Checking energy status (energy is low)');
    }
    
    // 4. 如果没有其他操作，尝试使用随机技能
    if (decisions.length === 0 && skills.length > 0) {
      const randomSkill = skills[Math.floor(Math.random() * skills.length)];
      decisions.push({
        skillName: randomSkill.name,
        parameters: {}
      });
      reasoningParts.push(`Using skill ${randomSkill.name} (random selection in simulation mode)`);
    }
    
    const reasoning = reasoningParts.length > 0 
      ? `[SIMULATION MODE] ${reasoningParts.join('. ')}`
      : '[SIMULATION MODE] No actions needed at this time';
    
    return { decisions, reasoning };
  }
}
