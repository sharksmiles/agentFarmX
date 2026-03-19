import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDatabaseData() {
  log('cyan', '\n========== 检查数据库数据 ==========\n');

  // 1. 检查用户
  const users = await prisma.user.findMany({
    select: {
      id: true,
      walletAddress: true,
      username: true,
      level: true,
      farmCoins: true,
    },
    take: 5,
  });
  log('blue', `用户数量: ${users.length}`);
  if (users.length > 0) {
    console.log('用户示例:', JSON.stringify(users[0], null, 2));
  }

  // 2. 检查农场状态
  const farmStates = await prisma.farmState.findMany({
    select: {
      id: true,
      userId: true,
      energy: true,
      maxEnergy: true,
      unlockedLands: true,
    },
    take: 5,
  });
  log('blue', `\n农场状态数量: ${farmStates.length}`);
  if (farmStates.length > 0) {
    console.log('农场状态示例:', JSON.stringify(farmStates[0], null, 2));
  }

  // 3. 检查地块
  const landPlots = await prisma.landPlot.findMany({
    select: {
      id: true,
      plotIndex: true,
      cropId: true,
      growthStage: true,
      farmStateId: true,
    },
    take: 10,
  });
  log('blue', `\n地块数量: ${landPlots.length}`);
  if (landPlots.length > 0) {
    console.log('地块示例:', JSON.stringify(landPlots.slice(0, 3), null, 2));
  }

  // 4. 检查技能
  const skills = await prisma.agentSkill.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      displayName: true,
      category: true,
      energyCost: true,
      priceUsdc: true,
    },
  });
  log('blue', `\n可用技能数量: ${skills.length}`);
  console.log('技能列表:', JSON.stringify(skills, null, 2));

  // 5. 检查 Agent
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      strategyType: true,
      aiModel: true,
      userId: true,
      lastActiveAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  log('blue', `\nAgent 总数: ${agents.length}`);
  log('blue', `活跃 Agent 数量: ${agents.filter(a => a.isActive).length}`);
  if (agents.length > 0) {
    console.log('Agent 列表:', JSON.stringify(agents, null, 2));
  }

  // 6. 检查 Agent 决策记录
  const decisions = await prisma.agentDecision.findMany({
    select: {
      id: true,
      agentId: true,
      model: true,
      decisions: true,
      reasoning: true,
      executed: true,
      success: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  log('blue', `\n决策记录数量: ${decisions.length}`);
  if (decisions.length > 0) {
    console.log('最近决策:', JSON.stringify(decisions, null, 2));
  }

  // 7. 检查 Agent 日志
  const logs = await prisma.agentLog.findMany({
    select: {
      id: true,
      agentId: true,
      level: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  log('blue', `\nAgent 日志数量: ${logs.length}`);
  if (logs.length > 0) {
    console.log('最近日志:', JSON.stringify(logs.slice(0, 5), null, 2));
  }

  return { users, farmStates, landPlots, skills, agents, decisions, logs };
}

async function simulateAgentTick() {
  log('cyan', '\n========== 模拟 Agent Tick 执行 ==========\n');

  // 查找活跃的 Agent
  const activeAgents = await prisma.agent.findMany({
    where: { isActive: true },
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

  if (activeAgents.length === 0) {
    log('yellow', '没有找到活跃的 Agent，尝试查找任意 Agent...');
    
    const anyAgent = await prisma.agent.findFirst({
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

    if (anyAgent) {
      log('yellow', `找到非活跃 Agent: ${anyAgent.name} (${anyAgent.id})`);
      log('yellow', '需要先激活此 Agent 才能测试 agent-tick');
      
      // 显示 Agent 详情
      console.log('\nAgent 详情:');
      console.log('- ID:', anyAgent.id);
      console.log('- 名称:', anyAgent.name);
      console.log('- 状态:', anyAgent.status);
      console.log('- 是否活跃:', anyAgent.isActive);
      console.log('- 策略类型:', anyAgent.strategyType);
      console.log('- AI 模型:', anyAgent.aiModel);
      
      if (anyAgent.user) {
        console.log('\n关联用户:');
        console.log('- 用户 ID:', anyAgent.user.id);
        console.log('- 钱包地址:', anyAgent.user.walletAddress);
        console.log('- 农场币:', anyAgent.user.farmCoins);
        
        if (anyAgent.user.farmState) {
          console.log('\n农场状态:');
          console.log('- 能量:', anyAgent.user.farmState.energy);
          console.log('- 最大能量:', anyAgent.user.farmState.maxEnergy);
          console.log('- 解锁地块:', anyAgent.user.farmState.unlockedLands);
          console.log('- 地块数量:', anyAgent.user.farmState.landPlots.length);
          
          // 显示地块详情
          if (anyAgent.user.farmState.landPlots.length > 0) {
            console.log('\n地块详情:');
            anyAgent.user.farmState.landPlots.forEach(plot => {
              console.log(`  地块 ${plot.plotIndex}: ${plot.cropId || '空'} (生长阶段: ${plot.growthStage})`);
            });
          }
        }
      }
      
      return { success: false, reason: 'NO_ACTIVE_AGENT', agent: anyAgent };
    } else {
      log('red', '数据库中没有任何 Agent！');
      return { success: false, reason: 'NO_AGENT' };
    }
  }

  log('green', `找到 ${activeAgents.length} 个活跃的 Agent\n`);

  // 获取可用技能
  const skills = await prisma.agentSkill.findMany({
    where: { isActive: true },
  });
  log('blue', `可用技能: ${skills.length} 个`);

  // 模拟每个 Agent 的决策过程
  for (const agent of activeAgents) {
    log('cyan', `\n----- 处理 Agent: ${agent.name} (${agent.id}) -----`);
    
    const context = {
      farmState: agent.user?.farmState,
      inventory: agent.user?.inventory || [],
      coins: agent.user?.farmCoins || 0,
      energy: agent.user?.farmState?.energy || 0,
    };

    console.log('上下文:');
    console.log('- 能量:', context.energy);
    console.log('- 农场币:', context.coins);
    console.log('- 地块数量:', context.farmState?.landPlots?.length || 0);

    // 模拟决策逻辑（与 AgentService.generateSimulatedDecision 相同）
    const simulatedDecision = simulateDecision(agent, context, skills);
    
    log('yellow', '\n模拟决策结果:');
    console.log('- 推理:', simulatedDecision.reasoning);
    console.log('- 决策:', JSON.stringify(simulatedDecision.decisions, null, 2));

    // 检查决策是否可执行
    if (simulatedDecision.decisions.length > 0) {
      for (const decision of simulatedDecision.decisions) {
        const skill = skills.find(s => s.name === decision.skillName);
        if (skill) {
          log('green', `\n✓ 技能 "${skill.displayName}" 存在`);
          console.log('  - 类别:', skill.category);
          console.log('  - 能量消耗:', skill.energyCost);
          console.log('  - 参数:', JSON.stringify(decision.parameters));

          // 检查能量是否足够
          if (skill.energyCost > 0 && context.energy < skill.energyCost) {
            log('red', `  ✗ 能量不足! 需要 ${skill.energyCost}, 当前 ${context.energy}`);
          } else if (skill.energyCost > 0) {
            log('green', `  ✓ 能量充足 (${context.energy}/${skill.energyCost})`);
          }

          // 检查付费技能
          if (skill.priceUsdc && skill.priceUsdc > 0) {
            const validAuth = await prisma.agentPaymentAuth.findFirst({
              where: {
                agentId: agent.id,
                isActive: true,
                validBefore: { gt: new Date() },
              },
            });
            
            if (validAuth) {
              const remaining = validAuth.authorizedValue - validAuth.usedValue;
              log('green', `  ✓ 有有效预授权，剩余: ${Number(remaining) / 1e6} USDC`);
            } else {
              log('red', `  ✗ 付费技能需要预授权! 价格: ${skill.priceUsdc} USDC`);
            }
          }
        } else {
          log('red', `✗ 技能 "${decision.skillName}" 不存在!`);
        }
      }
    } else {
      log('yellow', '没有生成任何决策');
    }
  }

  return { success: true, agentCount: activeAgents.length };
}

/**
 * 模拟决策逻辑（与 AgentService.generateSimulatedDecision 相同）
 */
function simulateDecision(
  agent: any,
  context: any,
  skills: any[]
): { decisions: any[]; reasoning: string } {
  const decisions: any[] = [];
  const reasoningParts: string[] = [];

  const farmState = context.farmState;
  const landPlots = farmState?.landPlots || [];
  const energy = context.energy || 0;
  const strategyType = agent.strategyType || 'balanced';

  // 1. 检查是否有可收获的作物
  const harvestablePlots = landPlots.filter(
    (plot: any) => plot.cropId && plot.growthStage >= 4
  );

  if (harvestablePlots.length > 0 && energy >= 10) {
    const plot = harvestablePlots[0];
    decisions.push({
      skillName: 'harvest_crop',
      // 注意：farm.service.ts 中的 harvest 方法会将 plotIndex - 1
      // 所以前端/API 传入的索引是从1开始的，这里需要 +1
      parameters: { plotIndex: plot.plotIndex + 1 },
    });
    reasoningParts.push(`收获地块 ${plot.plotIndex} 的作物`);
  }

  // 2. 检查是否有空地块可以种植
  const emptyPlots = landPlots.filter((plot: any) => !plot.cropId);

  if (emptyPlots.length > 0 && energy >= 15 && decisions.length === 0) {
    const cropId = strategyType === 'aggressive' ? 'corn' : 'wheat';
    decisions.push({
      skillName: 'plant_crop',
      parameters: {
        // 注意：farm.service.ts 中的 plant 方法会将 plotIndex - 1
        // 所以前端/API 传入的索引是从1开始的，这里需要 +1
        plotIndex: emptyPlots[0].plotIndex + 1,
        cropId,
      },
    });
    reasoningParts.push(`在空地块 ${emptyPlots[0].plotIndex} 种植 ${cropId}`);
  }

  // 3. 检查能量状态
  if (energy < 30 && decisions.length === 0) {
    decisions.push({
      skillName: 'check_energy',
      parameters: {},
    });
    reasoningParts.push('检查能量状态（能量较低）');
  }

  // 4. 如果没有其他操作，尝试使用随机技能
  if (decisions.length === 0 && skills.length > 0) {
    const randomSkill = skills[Math.floor(Math.random() * skills.length)];
    decisions.push({
      skillName: randomSkill.name,
      parameters: {},
    });
    reasoningParts.push(`使用技能 ${randomSkill.name}（模拟模式随机选择）`);
  }

  const reasoning =
    reasoningParts.length > 0
      ? `[模拟模式] ${reasoningParts.join('. ')}`
      : '[模拟模式] 当前无需操作';

  return { decisions, reasoning };
}

async function testAgentTickAPI() {
  log('cyan', '\n========== 测试 Agent Tick API ==========\n');

  // 检查环境变量
  const cronSecret = process.env.CRON_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  log('blue', `应用 URL: ${appUrl}`);
  log('blue', `CRON_SECRET: ${cronSecret ? '已配置' : '未配置'}`);

  if (!cronSecret) {
    log('yellow', '\n警告: CRON_SECRET 未配置，API 调用可能会失败');
  }

  // 尝试调用 API
  try {
    const response = await fetch(`${appUrl}/api/cron/agent-tick`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret || 'test'}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('green', '\n✓ API 调用成功!');
      console.log('响应:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      log('red', `\n✗ API 调用失败: ${response.status}`);
      console.log('错误:', JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (error: any) {
    log('red', `\n✗ API 调用异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  log('green', '========================================');
  log('green', '   Agent Tick 模拟测试');
  log('green', '========================================');

  try {
    // 1. 检查数据库数据
    await checkDatabaseData();

    // 2. 模拟 Agent Tick 执行
    const simulateResult = await simulateAgentTick();

    // 3. 尝试调用实际 API（可选）
    const args = process.argv.slice(2);
    if (args.includes('--api')) {
      await testAgentTickAPI();
    } else {
      log('yellow', '\n提示: 使用 --api 参数可以测试实际 API 调用');
    }

    // 总结
    log('cyan', '\n========== 测试总结 ==========\n');
    
    if (simulateResult.success) {
      log('green', `✓ 模拟测试完成，处理了 ${simulateResult.agentCount} 个 Agent`);
    } else if (simulateResult.reason === 'NO_ACTIVE_AGENT') {
      log('yellow', '! 没有活跃的 Agent，需要先启动 Agent');
      log('yellow', '  提示: 可以通过 API /api/agents/[id]/start 启动 Agent');
    } else if (simulateResult.reason === 'NO_AGENT') {
      log('red', '✗ 数据库中没有 Agent，需要先创建 Agent');
    }

  } catch (error) {
    log('red', `\n测试失败: ${error}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
