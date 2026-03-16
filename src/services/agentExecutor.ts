import { prisma } from '@/lib/prisma';
import { AgentService } from './agentService';
import { BaseService, ServiceError } from './base.service';
import { Agent, AgentSkill, AgentDecision } from '@prisma/client';

/**
 * Skill执行上下文
 */
export interface SkillExecutionContext {
  agentId: string;
  userId: string;
  agent: Agent;
}

/**
 * Skill执行结果
 */
export interface SkillExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Skill执行函数类型
 */
type SkillExecutor = (
  params: Record<string, any>,
  context: SkillExecutionContext
) => Promise<SkillExecutionResult>;

/**
 * Agent执行引擎
 * 负责执行AI决策、管理Agent生命周期
 */
export class AgentExecutor extends BaseService {
  // 存储运行中的Agent定时器
  private static runningAgents = new Map<string, NodeJS.Timeout>();
  
  // Skill执行器注册表
  private static skillExecutors: Map<string, SkillExecutor> = new Map();

  /**
   * 注册Skill执行器
   */
  static registerSkill(skillName: string, executor: SkillExecutor): void {
    this.skillExecutors.set(skillName, executor);
  }

  /**
   * 启动Agent自动执行
   */
  static async startAgent(agentId: string): Promise<void> {
    // 检查是否已在运行
    if (this.runningAgents.has(agentId)) {
      throw new ServiceError('Agent is already running', 'AGENT_RUNNING', 400);
    }

    // 获取Agent信息
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent) {
      throw ServiceError.notFound('Agent', agentId);
    }

    // 更新状态为运行中
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'running',
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    // 创建执行定时器（每5分钟执行一次）
    const interval = setInterval(async () => {
      try {
        await this.executeAgentCycle(agentId);
      } catch (error) {
        console.error(`[AgentExecutor] Agent ${agentId} cycle error:`, error);
        await this.logAgentError(agentId, error);
      }
    }, 5 * 60 * 1000);

    this.runningAgents.set(agentId, interval);
    
    // 立即执行一次
    await this.executeAgentCycle(agentId);
  }

  /**
   * 停止Agent执行
   */
  static async stopAgent(agentId: string): Promise<void> {
    const interval = this.runningAgents.get(agentId);
    
    if (interval) {
      clearInterval(interval);
      this.runningAgents.delete(agentId);
    }

    // 更新状态
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'idle',
        isActive: false,
      },
    });
  }

  /**
   * 执行Agent决策周期
   */
  private static async executeAgentCycle(agentId: string): Promise<void> {
    // 1. 触发AI决策
    const decisionResult = await AgentService.triggerDecision(agentId);

    if (!decisionResult.success || !decisionResult.decision) {
      console.log(`[AgentExecutor] Agent ${agentId} decision failed:`, decisionResult.error);
      return;
    }

    // 2. 执行决策
    await this.executeDecision(decisionResult.decision);
  }

  /**
   * 执行AI决策
   */
  static async executeDecision(decision: AgentDecision): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: decision.agentId },
      include: { user: true },
    });

    if (!agent) {
      throw ServiceError.notFound('Agent', decision.agentId);
    }

    const decisions = decision.decisions as Array<{
      skillName: string;
      parameters: Record<string, any>;
      reasoning?: string;
    }>;

    if (!Array.isArray(decisions) || decisions.length === 0) {
      console.log(`[AgentExecutor] No decisions to execute for agent ${decision.agentId}`);
      return;
    }

    const context: SkillExecutionContext = {
      agentId: agent.id,
      userId: agent.userId,
      agent,
    };

    let successCount = 0;
    let failCount = 0;

    for (const d of decisions) {
      try {
        const result = await this.executeSkill(d.skillName, d.parameters, context);
        
        if (result.success) {
          successCount++;
          await this.logAgentInfo(agent.id, `Executed ${d.skillName}: ${result.message}`, {
            parameters: d.parameters,
            reasoning: d.reasoning,
          });
        } else {
          failCount++;
          await this.logAgentWarning(agent.id, `Skill ${d.skillName} failed: ${result.error}`);
        }
      } catch (error: any) {
        failCount++;
        await this.logAgentError(agent.id, `Skill ${d.skillName} exception: ${error.message}`);
      }
    }

    // 更新决策执行状态
    await prisma.agentDecision.update({
      where: { id: decision.id },
      data: {
        executed: true,
        success: failCount === 0,
      },
    });

    // 更新Agent统计
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        totalTasks: { increment: decisions.length },
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * 执行单个Skill
   */
  private static async executeSkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    // 获取Skill信息
    const skill = await prisma.agentSkill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      return {
        success: false,
        message: `Skill not found: ${skillName}`,
        error: 'SKILL_NOT_FOUND',
      };
    }

    // 检查冷却时间
    if (skill.cooldown > 0) {
      const lastUsage = await prisma.agentSkillUsage.findFirst({
        where: {
          agentId: context.agentId,
          skillId: skill.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastUsage) {
        const cooldownMs = skill.cooldown * 1000;
        const elapsed = Date.now() - lastUsage.createdAt.getTime();
        
        if (elapsed < cooldownMs) {
          return {
            success: false,
            message: `Skill on cooldown`,
            error: 'SKILL_ON_COOLDOWN',
          };
        }
      }
    }

    // 检查能量消耗
    if (skill.energyCost > 0) {
      const farmState = await prisma.farmState.findUnique({
        where: { userId: context.userId },
      });

      if (!farmState || farmState.energy < skill.energyCost) {
        return {
          success: false,
          message: 'Insufficient energy',
          error: 'INSUFFICIENT_ENERGY',
        };
      }
    }

    // 执行Skill
    const executor = this.skillExecutors.get(skillName);
    let result: SkillExecutionResult;

    if (executor) {
      result = await executor(parameters, context);
    } else {
      // 默认执行器：记录任务
      result = await this.defaultSkillExecutor(skill, parameters, context);
    }

    // 记录Skill使用
    await prisma.agentSkillUsage.create({
      data: {
        agentId: context.agentId,
        skillId: skill.id,
        parameters,
        result: result.data,
        success: result.success,
        error: result.error,
      },
    });

    // 更新Skill统计
    await prisma.agentSkill.update({
      where: { id: skill.id },
      data: {
        totalUsages: { increment: 1 },
        successCount: { increment: result.success ? 1 : 0 },
      },
    });

    return result;
  }

  /**
   * 默认Skill执行器
   */
  private static async defaultSkillExecutor(
    skill: AgentSkill,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    // 创建任务记录
    const task = await prisma.agentTask.create({
      data: {
        agentId: context.agentId,
        taskType: skill.name,
        taskData: parameters,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // 根据Skill类型执行不同逻辑
      let result: any;

      switch (skill.category) {
        case 'farming':
          result = await this.executeFarmingSkill(skill.name, parameters, context);
          break;
        case 'trading':
          result = await this.executeTradingSkill(skill.name, parameters, context);
          break;
        case 'social':
          result = await this.executeSocialSkill(skill.name, parameters, context);
          break;
        case 'strategy':
          result = await this.executeStrategySkill(skill.name, parameters, context);
          break;
        default:
          throw new Error(`Unknown skill category: ${skill.category}`);
      }

      // 更新任务状态
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          result,
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Successfully executed ${skill.name}`,
        data: result,
      };
    } catch (error: any) {
      // 更新任务状态为失败
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        message: error.message,
        error: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 执行农场类Skill
   */
  private static async executeFarmingSkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<any> {
    switch (skillName) {
      case 'plant_crop':
        // 调用种植逻辑
        const farmService = await import('./farm.service').then(m => new m.FarmService());
        return farmService.plant(context.userId, parameters.plotIndex, parameters.cropId);

      case 'harvest_crop':
        const farmService2 = await import('./farm.service').then(m => new m.FarmService());
        return farmService2.harvest(context.userId, parameters.plotIndex);

      case 'analyze_farm_state':
        const farmState = await prisma.farmState.findUnique({
          where: { userId: context.userId },
          include: { landPlots: true },
        });
        return {
          energy: farmState?.energy,
          maxEnergy: farmState?.maxEnergy,
          emptyPlots: farmState?.landPlots.filter(p => !p.cropId).length,
          matureCrops: farmState?.landPlots.filter(p => p.growthStage === 4).length,
        };

      default:
        throw new Error(`Unknown farming skill: ${skillName}`);
    }
  }

  /**
   * 执行交易类Skill
   */
  private static async executeTradingSkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<any> {
    // TODO: 实现交易逻辑
    return { message: `Trading skill ${skillName} executed` };
  }

  /**
   * 执行社交类Skill
   */
  private static async executeSocialSkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<any> {
    // TODO: 实现社交逻辑
    return { message: `Social skill ${skillName} executed` };
  }

  /**
   * 执行策略类Skill
   */
  private static async executeStrategySkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<any> {
    switch (skillName) {
      case 'optimize_planting_schedule':
        const cropConfigs = await prisma.cropConfig.findMany({
          where: { isActive: true },
        });
        
        const schedule = cropConfigs
          .map(crop => ({
            cropId: crop.cropType,
            profitPerHour: crop.harvestPrice / (crop.matureTime / 60),
          }))
          .sort((a, b) => b.profitPerHour - a.profitPerHour);
        
        return { schedule, recommendation: schedule[0]?.cropId };

      case 'risk_assessment':
        const user = await prisma.user.findUnique({
          where: { id: context.userId },
          include: { farmState: true },
        });
        
        const risks: string[] = [];
        const opportunities: string[] = [];

        if (user?.farmState && user.farmState.energy < 50) {
          risks.push('Low energy - consider waiting for recovery');
        }
        if (user && user.farmCoins < 100) {
          risks.push('Low coins - focus on harvesting');
        }

        return { risks, opportunities };

      default:
        throw new Error(`Unknown strategy skill: ${skillName}`);
    }
  }

  /**
   * 记录Agent信息日志
   */
  private static async logAgentInfo(agentId: string, message: string, metadata?: any): Promise<void> {
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message,
        metadata,
      },
    });
  }

  /**
   * 记录Agent警告日志
   */
  private static async logAgentWarning(agentId: string, message: string): Promise<void> {
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'warning',
        message,
      },
    });
  }

  /**
   * 记录Agent错误日志
   */
  private static async logAgentError(agentId: string, error: any): Promise<void> {
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'error',
        message: error instanceof Error ? error.message : String(error),
        metadata: error instanceof Error ? { stack: error.stack } : undefined,
      },
    });
  }

  /**
   * 获取所有运行中的Agent
   */
  static getRunningAgents(): string[] {
    return Array.from(this.runningAgents.keys());
  }

  /**
   * 检查Agent是否在运行
   */
  static isAgentRunning(agentId: string): boolean {
    return this.runningAgents.has(agentId);
  }
}
