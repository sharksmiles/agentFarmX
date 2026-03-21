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
    console.log(`[AgentExecutor] ===== executeDecision START =====`);
    console.log(`[AgentExecutor] decision.id: ${decision.id}`);
    console.log(`[AgentExecutor] decision.agentId: ${decision.agentId}`);
    console.log(`[AgentExecutor] decision.decisions:`, JSON.stringify(decision.decisions));
    
    const agent = await prisma.agent.findUnique({
      where: { id: decision.agentId },
      include: { user: true },
    });

    if (!agent) {
      console.error(`[AgentExecutor] Agent not found: ${decision.agentId}`);
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
      console.log(`[AgentExecutor] Processing decision: skillName=${d.skillName}`);
      try {
        const result = await this.executeSkill(d.skillName, d.parameters, context);
        
        console.log(`[AgentExecutor] Skill result: success=${result.success}, message=${result.message}, error=${result.error}`);
        
        if (result.success) {
          successCount++;
          await this.logAgentInfo(agent.id, `Executed ${d.skillName}: ${result.message}`, {
            parameters: d.parameters,
            reasoning: d.reasoning,
          });
        } else {
          failCount++;
          console.error(`[AgentExecutor] Skill ${d.skillName} failed: ${result.error}`);
          await this.logAgentWarning(agent.id, `Skill ${d.skillName} failed: ${result.error}`);
        }
      } catch (error: any) {
        failCount++;
        console.error(`[AgentExecutor] Skill ${d.skillName} exception:`, error.message);
        console.error(`[AgentExecutor] Stack:`, error.stack);
        await this.logAgentError(agent.id, `Skill ${d.skillName} exception: ${error.message}`);
      }
    }

    console.log(`[AgentExecutor] Execution summary: successCount=${successCount}, failCount=${failCount}`);

    // 更新决策执行状态
    await prisma.agentDecision.update({
      where: { id: decision.id },
      data: {
        executed: true,
        success: failCount === 0,
      },
    });
    
    console.log(`[AgentExecutor] Decision ${decision.id} updated: executed=true, success=${failCount === 0}`);

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
    console.log(`[AgentExecutor] ===== executeSkill START =====`);
    console.log(`[AgentExecutor] skillName: ${skillName}`);
    console.log(`[AgentExecutor] parameters:`, JSON.stringify(parameters));
    console.log(`[AgentExecutor] context.agentId: ${context.agentId}, context.userId: ${context.userId}`);
    
    // 获取Skill信息
    const skill = await prisma.agentSkill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      console.error(`[AgentExecutor] SKILL_NOT_FOUND: ${skillName}`);
      return {
        success: false,
        message: `Skill not found: ${skillName}`,
        error: 'SKILL_NOT_FOUND',
      };
    }
    
    console.log(`[AgentExecutor] Found skill: ${skill.displayName}, category: ${skill.category}, energyCost: ${skill.energyCost}`);

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

    // 检查 x402 预授权付费
    if (skill.priceUsdc && skill.priceUsdc > 0) {
      // 查找有效的预授权
      const validAuth = await prisma.agentPaymentAuth.findFirst({
        where: {
          agentId: context.agentId,
          isActive: true,
          validBefore: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!validAuth) {
        await this.logAgentWarning(context.agentId, 
          `No valid pre-authorization for paid skill: ${skillName}`);
        
        return {
          success: false,
          message: 'No valid pre-authorization. Please authorize payment first.',
          error: 'NO_VALID_PREAUTH',
          data: { 
            needsPreauth: true,
            skillName,
            priceUsdc: skill.priceUsdc,
          },
        };
      }

      // 计算剩余额度
      const priceMicroUsdc = BigInt(Math.floor(skill.priceUsdc * 1e6));
      const remaining = validAuth.authorizedValue - validAuth.usedValue;

      if (remaining < priceMicroUsdc) {
        await this.logAgentWarning(context.agentId, 
          `Insufficient pre-authorization balance for ${skillName}. Required: ${skill.priceUsdc} USDC, Remaining: ${Number(remaining) / 1e6} USDC`);
        
        return {
          success: false,
          message: `Insufficient pre-authorization balance. Required: ${skill.priceUsdc} USDC`,
          error: 'INSUFFICIENT_PREAUTH_BALANCE',
          data: { 
            needsPreauth: true,
            requiredUsdc: skill.priceUsdc,
            remainingUsdc: Number(remaining) / 1e6,
          },
        };
      }

      // 执行链上转账（如果配置了链上服务）
      let txHash: string | null = null;
      
      // 根据授权类型选择不同的转账方式
      if (validAuth.authType === 'permit2') {
        // 使用 Permit2 转账
        const { permit2TransferFrom, isPermit2Configured } = await import('./permit2Service');
        
        if (isPermit2Configured()) {
          try {
            // 从 nonce 字段解析 sigDeadline: permit2-${nonce}-${sigDeadline}
            const nonceParts = validAuth.nonce.split('-');
            const storedSigDeadline = nonceParts.length >= 3 
              ? BigInt(nonceParts[2]) 
              : BigInt(Math.floor(validAuth.createdAt.getTime() / 1000) + 3600);
            
            // 重建 PermitSingle 数据结构
            const permitSingle = {
              details: {
                token: validAuth.asset,
                amount: BigInt(validAuth.authorizedValue.toString()),
                expiration: Math.floor(validAuth.validBefore.getTime() / 1000),
                nonce: validAuth.permit2Nonce || 0,
              },
              spender: validAuth.payTo,
              sigDeadline: storedSigDeadline,
            };
            
            const result = await permit2TransferFrom(
              validAuth.userId,  // from
              validAuth.payTo,   // to
              priceMicroUsdc,    // amount
              permitSingle,      // PermitSingle 数据
              validAuth.signature // 签名
            );
            
            if (result.success) {
              txHash = result.txHash || null;
              await this.logAgentInfo(context.agentId, 
                `Permit2 transfer successful: ${txHash}`);
            } else {
              await this.logAgentError(context.agentId, 
                `Permit2 transfer failed: ${result.error}`);
              return {
                success: false,
                message: `Payment failed: ${result.error}`,
                error: 'PERMIT2_TRANSFER_FAILED',
                data: { 
                  needsPreauth: false,
                  error: result.error,
                },
              };
            }
          } catch (error: any) {
            await this.logAgentError(context.agentId, 
              `Permit2 transfer error: ${error.message}`);
            return {
              success: false,
              message: `Payment error: ${error.message}`,
              error: 'PERMIT2_TRANSFER_ERROR',
              data: { 
                needsPreauth: false,
                error: error.message,
              },
            };
          }
        } else {
          // Permit2 未配置，使用模拟模式
          await this.logAgentInfo(context.agentId, 
            `Using simulated payment (Permit2 service not configured)`);
        }
      } else {
        // 使用 EIP-3009 转账（旧方式）
        const { executeTransferWithAuthorization, parseSignature, isTransferServiceConfigured } = await import('./usdcTransferService');
        
        if (isTransferServiceConfigured()) {
          try {
            // 从签名中提取v, r, s
            const { v, r, s } = parseSignature(validAuth.signature);
            
            // 执行链上转账
            const result = await executeTransferWithAuthorization({
              from: validAuth.userId,
              to: validAuth.payTo,
              value: priceMicroUsdc,
              validAfter: Math.floor(validAuth.validAfter.getTime() / 1000),
              validBefore: Math.floor(validAuth.validBefore.getTime() / 1000),
              nonce: validAuth.nonce,
              v,
              r,
              s,
            });
            
            if (result.success) {
              txHash = result.txHash || null;
              await this.logAgentInfo(context.agentId, 
                `On-chain transfer successful: ${txHash}`);
            } else {
              // 链上转账失败，回滚数据库操作
              await this.logAgentError(context.agentId, 
                `On-chain transfer failed: ${result.error}`);
              return {
                success: false,
                message: `Payment failed: ${result.error}`,
                error: 'ONCHAIN_TRANSFER_FAILED',
                data: { 
                  needsPreauth: false,
                  error: result.error,
                },
              };
            }
          } catch (error: any) {
            await this.logAgentError(context.agentId, 
              `On-chain transfer error: ${error.message}`);
            return {
              success: false,
              message: `Payment error: ${error.message}`,
              error: 'ONCHAIN_TRANSFER_ERROR',
              data: { 
                needsPreauth: false,
                error: error.message,
              },
            };
          }
        } else {
          // 未配置链上服务，使用数据库模拟模式
          await this.logAgentInfo(context.agentId, 
            `Using simulated payment (on-chain service not configured)`);
        }
      }

      // 扣除预授权额度（数据库记录）
      await prisma.agentPaymentAuth.update({
        where: { id: validAuth.id },
        data: {
          usedValue: { increment: priceMicroUsdc },
        },
      });

      // 记录付费日志
      await this.logAgentInfo(context.agentId, 
        `Paid ${skill.priceUsdc} USDC via x402 preauth for skill: ${skillName}`, {
          skillName,
          priceUsdc: skill.priceUsdc,
          currency: skill.priceCurrency || 'USDC',
          authId: validAuth.id,
          remainingAfter: (remaining - priceMicroUsdc).toString(),
          txHash,
          onChain: !!txHash,
        });
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
    console.log(`[AgentExecutor] Executing farming skill: ${skillName}`, JSON.stringify(parameters));
    
    switch (skillName) {
      case 'plant_crop':
        // 调用种植 API（需要 x402 支付）
        console.log(`[AgentExecutor] Planting crop: userId=${context.userId}, plotIndex=${parameters.plotIndex}, cropId=${parameters.cropId}`);
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/farm/plant`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': context.userId,
            },
            // 不传 mode，默认为 agent 模式，需要付费
            body: JSON.stringify({
              plotIndex: parameters.plotIndex,
              cropId: parameters.cropId,
            }),
          });
          
          const result = await response.json();
          console.log(`[AgentExecutor] Plant result:`, JSON.stringify(result));
          
          if (!response.ok) {
            throw new Error(result.error || 'Plant failed');
          }
          
          return result.data;
        } catch (error: any) {
          console.error(`[AgentExecutor] Plant failed:`, error.message);
          throw error;
        }

      case 'harvest_crop':
        // 调用收获 API（需要 x402 支付）
        console.log(`[AgentExecutor] Harvesting: userId=${context.userId}, plotIndex=${parameters.plotIndex}`);
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/farm/harvest`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': context.userId,
            },
            // 不传 mode，默认为 agent 模式，需要付费
            body: JSON.stringify({
              plotIndex: parameters.plotIndex,
            }),
          });
          
          const result = await response.json();
          console.log(`[AgentExecutor] Harvest result:`, JSON.stringify(result));
          
          if (!response.ok) {
            throw new Error(result.error || 'Harvest failed');
          }
          
          return result.data;
        } catch (error: any) {
          console.error(`[AgentExecutor] Harvest failed:`, error.message);
          throw error;
        }

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

      case 'use_boost':
        console.log(`[AgentExecutor] Boosting crop: userId=${context.userId}`);
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          // Find a non-mature planted crop to boost
          let plotIdx = parameters.plotIndex;
          if (plotIdx === undefined) {
            const nonMaturePlot = await prisma.landPlot.findFirst({
              where: {
                farmState: { userId: context.userId },
                cropId: { not: null },
                growthStage: { lt: 4 },
              },
            });
            if (!nonMaturePlot) {
              return { success: false, message: 'No non-mature crop to boost' };
            }
            plotIdx = nonMaturePlot.plotIndex;
          }
          const response = await fetch(`${baseUrl}/api/farm/boost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': context.userId },
            body: JSON.stringify({ plotIndex: plotIdx }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Boost failed');
          }
          console.log(`[AgentExecutor] Boost result:`, JSON.stringify(result));
          return { success: true, plotIndex: plotIdx, data: result.data };
        } catch (error: any) {
          console.error(`[AgentExecutor] Boost failed:`, error.message);
          throw error;
        }

      case 'unlock_land':
        console.log(`[AgentExecutor] Unlocking land: userId=${context.userId}, plotIndex=${parameters.plotIndex}`);
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/farm/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': context.userId },
            body: JSON.stringify({ plotIndex: parameters.plotIndex }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Unlock failed');
          }
          console.log(`[AgentExecutor] Unlock result:`, JSON.stringify(result));
          return { success: true, data: result.data };
        } catch (error: any) {
          console.error(`[AgentExecutor] Unlock failed:`, error.message);
          throw error;
        }

      case 'buy_seed': {
        const requestedQuantities: Record<string, number> = parameters.quantities || {};
        const SEED_STOCK_THRESHOLD = 5; // 已有 >= 5 颗则跳过购买

        // 查询背包中已有的种子库存
        const existingInventory = await prisma.inventory.findMany({
          where: {
            userId: context.userId,
            itemType: 'seed',
            itemId: { in: Object.keys(requestedQuantities) },
          },
          select: { itemId: true, quantity: true },
        });
        const stockMap: Record<string, number> = {};
        for (const item of existingInventory) {
          stockMap[item.itemId] = item.quantity;
        }

        // 过滤掉库存充足的种子
        const filteredQuantities: Record<string, number> = {};
        for (const [cropId, qty] of Object.entries(requestedQuantities)) {
          const currentStock = stockMap[cropId] || 0;
          if (currentStock < SEED_STOCK_THRESHOLD) {
            filteredQuantities[cropId] = qty;
          } else {
            console.log(`[AgentExecutor] Skipping buy_seed for ${cropId}: already have ${currentStock} in stock`);
          }
        }

        if (Object.keys(filteredQuantities).length === 0) {
          return { success: true, message: 'Sufficient seeds in inventory, purchase skipped', data: { skipped: true, stockMap } };
        }

        console.log(`[AgentExecutor] Buying seeds: userId=${context.userId}, quantities=${JSON.stringify(filteredQuantities)}`);
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': context.userId },
            body: JSON.stringify({
              userId: context.userId,
              quantities: filteredQuantities,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to buy seeds');
          }
          console.log(`[AgentExecutor] Buy seed result:`, JSON.stringify(result));
          return { success: true, data: result.data };
        } catch (error: any) {
          console.error(`[AgentExecutor] Buy seed failed:`, error.message);
          throw error;
        }
      }

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
   * 执行社交类Skill (Raider Bot)
   */
  private static async executeSocialSkill(
    skillName: string,
    parameters: Record<string, any>,
    context: SkillExecutionContext
  ): Promise<any> {
    console.log(`[AgentExecutor] Executing social skill: ${skillName}`, JSON.stringify(parameters));
    
    switch (skillName) {
      case 'steal_crop':
        // 偷菜逻辑
        console.log(`[AgentExecutor] Stealing crop: userId=${context.userId}, targetUserId=${parameters.targetUserId}`);
        try {
          // 1. 如果没有指定目标，查找可偷菜的目标
          let targetUserId = parameters.targetUserId;
          let plotIndex = parameters.plotIndex;
          
          if (!targetUserId || targetUserId === 'nearby' || targetUserId === 'random') {
            // 查找有成熟作物的目标农场
            const targetPlot = await this.findStealableTarget(context.userId);
            if (!targetPlot) {
              return { success: false, message: 'No stealable crops found nearby' };
            }
            targetUserId = targetPlot.userId;
            plotIndex = targetPlot.plotIndex;
          }
          
          if (plotIndex === undefined) {
            // 查找目标的成熟作物
            const targetPlot = await this.findMatureCrop(targetUserId);
            if (!targetPlot) {
              return { success: false, message: 'No mature crops found on target farm' };
            }
            plotIndex = targetPlot.plotIndex;
          }
          
          // 2. 调用偷菜 API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/social/steal`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': context.userId,  // 用于内部 API 调用认证
            },
            body: JSON.stringify({
              friendId: targetUserId,
              plotIndex: plotIndex,
            }),
          });
          
          const result = await response.json();
          console.log(`[AgentExecutor] Steal result:`, JSON.stringify(result));
          
          if (!response.ok) {
            throw new Error(result.error || 'Steal failed');
          }
          
          return { 
            success: result.success, 
            reward: result.data?.reward,
            targetUserId,
            plotIndex 
          };
        } catch (error: any) {
          console.error(`[AgentExecutor] Steal failed:`, error.message);
          throw error;
        }

      case 'visit_friend':
        // 访问好友农场
        console.log(`[AgentExecutor] Visiting friend: userId=${context.userId}, friendId=${parameters.friendId}`);
        try {
          let friendId = parameters.friendId;
          
          if (!friendId || friendId === 'random') {
            // 随机选择一个好友
            const randomFriend = await this.findRandomFriend(context.userId);
            if (!randomFriend) {
              return { success: false, message: 'No friends to visit' };
            }
            friendId = randomFriend;
          }
          
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/social/visit`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': context.userId,
            },
            // Agent 执行需要付费，不传 mode 或传 'agent' 都会触发支付
            body: JSON.stringify({ friendId }),
          });
          
          const result = await response.json();
          console.log(`[AgentExecutor] Visit result:`, JSON.stringify(result));
          
          if (!response.ok) {
            throw new Error(result.error || 'Visit failed');
          }
          
          return { success: true, friendId };
        } catch (error: any) {
          console.error(`[AgentExecutor] Visit failed:`, error.message);
          throw error;
        }

      case 'radar_scan':
        // 扫描附近农场
        console.log(`[AgentExecutor] Scanning farms: userId=${context.userId}, radarLevel=${parameters.radarLevel}`);
        try {
          const radarLevel = parameters.radarLevel || 2;
          const targets = await this.scanNearbyFarms(context.userId, radarLevel);
          return { 
            success: true, 
            targetsFound: targets.length,
            targets: targets.slice(0, 5) // 返回前5个目标
          };
        } catch (error: any) {
          console.error(`[AgentExecutor] Scan failed:`, error.message);
          throw error;
        }

      case 'water_friend_crop':
        console.log(`[AgentExecutor] Watering friend crop: userId=${context.userId}, friendId=${parameters.friendId}`);
        try {
          let friendId = parameters.friendId;
          let plotIndex = parameters.plotIndex;

          if (!friendId || friendId === 'random') {
            const target = await this.findStealableTarget(context.userId);
            if (!target) {
              return { success: false, message: 'No watereable crops found nearby' };
            }
            friendId = target.userId;
            plotIndex = target.plotIndex;
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/social/water`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': context.userId,
            },
            body: JSON.stringify({ friendId, plotIndex }),
          });

          const result = await response.json();
          console.log(`[AgentExecutor] Water result:`, JSON.stringify(result));

          if (!response.ok) {
            throw new Error(result.error || 'Water failed');
          }

          return { success: true, friendId, plotIndex };
        } catch (error: any) {
          console.error(`[AgentExecutor] Water failed:`, error.message);
          throw error;
        }

      default:
        console.log(`[AgentExecutor] Unknown social skill: ${skillName}`);
        return { success: false, message: `Unknown social skill: ${skillName}` };
    }
  }

  /**
   * 查找可偷菜的目标
   */
  private static async findStealableTarget(userId: string): Promise<{ userId: string; plotIndex: number } | null> {
    const now = new Date();
    
    // 查找有成熟作物的农场（排除自己）
    const plotWithMatureCrop = await prisma.landPlot.findFirst({
      where: {
        cropId: { not: null },
        growthStage: { gte: 4 },
        farmState: {
          userId: { not: userId },
        },
      },
      include: {
        farmState: {
          select: { userId: true },
        },
      },
    });
    
    if (!plotWithMatureCrop) return null;
    
    return {
      userId: plotWithMatureCrop.farmState.userId,
      plotIndex: plotWithMatureCrop.plotIndex,
    };
  }

  /**
   * 查找目标农场的成熟作物
   */
  private static async findMatureCrop(targetUserId: string): Promise<{ plotIndex: number } | null> {
    const plot = await prisma.landPlot.findFirst({
      where: {
        cropId: { not: null },
        growthStage: { gte: 4 },
        farmState: {
          userId: targetUserId,
        },
      },
    });
    
    if (!plot) return null;
    
    return { plotIndex: plot.plotIndex };
  }

  /**
   * 随机选择一个好友
   */
  private static async findRandomFriend(userId: string): Promise<string | null> {
    const friendship = await prisma.socialAction.findFirst({
      where: {
        OR: [
          { fromUserId: userId, actionType: 'friend_accept' },
          { toUserId: userId, actionType: 'friend_accept' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!friendship) return null;
    
    // 返回好友的 ID
    return friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId;
  }

  /**
   * 扫描附近农场
   */
  private static async scanNearbyFarms(userId: string, radarLevel: number): Promise<any[]> {
    const limit = radarLevel * 3; // 雷达等级越高，扫描范围越大
    
    // 查找有成熟作物的农场
    const farmsWithMatureCrops = await prisma.farmState.findMany({
      where: {
        userId: { not: userId },
        landPlots: {
          some: {
            cropId: { not: null },
            growthStage: { gte: 4 },
          },
        },
      },
      include: {
        user: {
          select: { id: true, username: true, level: true },
        },
        landPlots: {
          where: {
            cropId: { not: null },
            growthStage: { gte: 4 },
          },
        },
      },
      take: limit,
    });
    
    return farmsWithMatureCrops.map(farm => ({
      userId: farm.userId,
      username: farm.user.username,
      level: farm.user.level,
      matureCropsCount: farm.landPlots.length,
    }));
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
      case 'check_energy': {
        const farmState = await prisma.farmState.findUnique({
          where: { userId: context.userId },
        });
        if (!farmState) return { success: false, message: 'Farm state not found' };
        return {
          success: true,
          energy: farmState.energy,
          maxEnergy: farmState.maxEnergy,
          energyPercent: Math.round((farmState.energy / farmState.maxEnergy) * 100),
        };
      }

      case 'optimize_farm':
      case 'optimize_planting_schedule': {
        const cropConfigs = await prisma.cropConfig.findMany({ where: { isActive: true } });
        const schedule = cropConfigs
          .map(crop => ({
            cropId: crop.cropType,
            profitPerHour: crop.harvestPrice / (crop.matureTime / 60),
          }))
          .sort((a, b) => b.profitPerHour - a.profitPerHour);
        return { success: true, schedule, recommendation: schedule[0]?.cropId };
      }

      case 'analyze_market':
      case 'risk_assessment': {
        const userInfo = await prisma.user.findUnique({
          where: { id: context.userId },
          include: { farmState: true },
        });
        const risks: string[] = [];
        const opportunities: string[] = [];
        if (userInfo?.farmState && userInfo.farmState.energy < 50) {
          risks.push('Low energy - consider waiting for recovery');
        }
        if (userInfo && userInfo.farmCoins < 100) {
          risks.push('Low coins - focus on harvesting');
        }
        return { success: true, risks, opportunities };
      }

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
