import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';
const USER_ID = 'test-user-id'; // 替换为实际用户ID

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

async function main() {
  log('green', '========================================');
  log('green', '   测试用户机器人执行状态');
  log('green', '========================================\n');

  // 1. 查询用户
  log('cyan', '========== 用户信息 ==========\n');
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    include: {
      agents: {
        include: {
          paymentAuths: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      },
      farmState: {
        include: { landPlots: { orderBy: { plotIndex: 'asc' } } }
      },
      inventory: true
    }
  });

  if (!user) {
    log('red', `❌ 未找到用户: ${USER_ID}`);
    await prisma.$disconnect();
    return;
  }

  log('blue', `用户 ID: ${user.id}`);
  log('blue', `钱包地址: ${user.walletAddress}`);
  log('blue', `用户名: ${user.username || '未设置'}`);
  log('blue', `农场币: ${user.farmCoins?.toString() || '0'}`);
  log('blue', `等级: ${user.level}`);

  // 2. 检查 Agent
  log('cyan', '\n========== Agent 信息 ==========\n');

  if (!user.agents || user.agents.length === 0) {
    log('red', '❌ 该用户没有创建 Agent');
    await prisma.$disconnect();
    return;
  }

  for (const agent of user.agents) {
    log('blue', `🤖 Agent: ${agent.name}`);
    log('blue', `   ID: ${agent.id}`);
    log('blue', `   状态: ${agent.status}`);
    log('blue', `   是否活跃: ${agent.isActive}`);
    log('blue', `   策略类型: ${agent.strategyType}`);
    log('blue', `   AI模型: ${agent.aiModel}`);
    log('blue', `   最后活跃: ${agent.lastActiveAt || '从未'}`);
    log('blue', `   SCA地址: ${agent.scaAddress || '未设置'}`);

    // 检查预授权
    if (agent.paymentAuths && agent.paymentAuths.length > 0) {
      const auth = agent.paymentAuths[0];
      const remaining = auth.authorizedValue - auth.usedValue;
      log('green', `   预授权状态: 有效`);
      log('blue', `   授权额度: ${Number(auth.authorizedValue) / 1e6} USDC`);
      log('blue', `   已使用: ${Number(auth.usedValue) / 1e6} USDC`);
      log('blue', `   剩余: ${Number(remaining) / 1e6} USDC`);
      
      // 检查是否过期
      const now = new Date();
      if (auth.validBefore < now) {
        log('red', `   ⚠️ 预授权已过期!`);
      } else {
        log('green', `   ✅ 预授权有效至: ${auth.validBefore}`);
      }
    } else {
      log('yellow', '   预授权状态: 无');
    }
  }

  // 3. 检查农场状态
  log('cyan', '\n========== 农场状态 ==========\n');
  const farmState = user.farmState;
  if (farmState) {
    log('blue', `能量: ${farmState.energy} / ${farmState.maxEnergy}`);
    log('blue', `解锁地块: ${farmState.unlockedLands}`);
    log('blue', `地块数量: ${farmState.landPlots?.length || 0}`);

    if (farmState.landPlots && farmState.landPlots.length > 0) {
      log('blue', '\n地块详情:');
      const harvestablePlots = farmState.landPlots.filter(p => p.cropId && p.growthStage >= 4);
      const growingPlots = farmState.landPlots.filter(p => p.cropId && p.growthStage < 4);
      const emptyPlots = farmState.landPlots.filter(p => !p.cropId);

      for (const plot of farmState.landPlots) {
        const status = plot.cropId 
          ? `${plot.cropId} (阶段 ${plot.growthStage}/4)` 
          : '空';
        const icon = plot.cropId 
          ? (plot.growthStage >= 4 ? '🌾' : '🌱') 
          : '⬜';
        log('blue', `  ${icon} 地块 ${plot.plotIndex}: ${status}`);
      }

      log('green', `\n可收获: ${harvestablePlots.length} 块`);
      log('yellow', `生长中: ${growingPlots.length} 块`);
      log('blue', `空闲: ${emptyPlots.length} 块`);
    }
  } else {
    log('red', '❌ 无农场状态');
  }

  // 4. 获取可用技能
  log('cyan', '\n========== 可用技能 ==========\n');
  const skills = await prisma.agentSkill.findMany({
    where: { isActive: true },
    select: { id: true, name: true, displayName: true, category: true, energyCost: true, priceUsdc: true }
  });

  log('blue', `可用技能数量: ${skills.length}`);
  for (const s of skills) {
    const price = s.priceUsdc ? ` (${s.priceUsdc} USDC)` : '';
    const energy = s.energyCost ? ` [能量: ${s.energyCost}]` : '';
    log('blue', `  - ${s.displayName}${energy}${price}`);
  }

  // 5. 模拟决策测试
  log('cyan', '\n========== 模拟决策测试 ==========\n');
  
  const agent = user.agents[0];
  let decision: { skillName: string; parameters: Record<string, any> } | null = null;
  let reasoning = '';

  if (farmState) {
    const harvestable = farmState.landPlots?.filter(p => p.cropId && p.growthStage >= 4) || [];
    const empty = farmState.landPlots?.filter(p => !p.cropId) || [];

    if (harvestable.length > 0 && farmState.energy >= 10) {
      decision = { skillName: 'harvest_crop', parameters: { plotIndex: harvestable[0].plotIndex + 1 } };
      reasoning = `收获地块 ${harvestable[0].plotIndex} 的作物`;
    } else if (empty.length > 0 && farmState.energy >= 15) {
      decision = { skillName: 'plant_crop', parameters: { plotIndex: empty[0].plotIndex + 1, cropId: 'wheat' } };
      reasoning = `在空地块 ${empty[0].plotIndex} 种植小麦`;
    } else if (farmState.energy < 10) {
      decision = { skillName: 'check_energy', parameters: {} };
      reasoning = '能量不足，检查能量状态';
    } else {
      decision = { skillName: 'water_crop', parameters: {} };
      reasoning = '尝试浇水操作';
    }
  }

  if (decision) {
    log('yellow', `决策: ${JSON.stringify(decision)}`);
    log('yellow', `推理: ${reasoning}`);

    const skill = skills.find(s => s.name === decision!.skillName);
    if (skill) {
      log('green', `\n✅ 技能存在: ${skill.displayName}`);
      log('blue', `   能量消耗: ${skill.energyCost}`);
      log('blue', `   价格: ${skill.priceUsdc ? `${skill.priceUsdc} USDC` : '免费'}`);

      // 检查能量是否足够
      if (skill.energyCost > 0 && farmState && farmState.energy < skill.energyCost) {
        log('red', `   ❌ 能量不足! 需要 ${skill.energyCost}, 当前 ${farmState.energy}`);
      } else if (skill.energyCost > 0) {
        log('green', `   ✅ 能量充足 (${farmState?.energy}/${skill.energyCost})`);
      }
    } else {
      log('red', `\n❌ 技能不存在: ${decision.skillName}`);
    }
  }

  // 6. 运行状态诊断
  log('cyan', '\n========== 运行状态诊断 ==========\n');

  const checks: { name: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];

  // 检查 Agent 状态
  if (agent.status === 'running' && agent.isActive) {
    checks.push({ name: 'Agent状态', status: 'ok', message: 'Agent正在运行' });
  } else if (agent.status === 'paused') {
    checks.push({ name: 'Agent状态', status: 'warning', message: 'Agent已暂停，需要启动' });
  } else if (agent.status === 'error') {
    checks.push({ name: 'Agent状态', status: 'error', message: 'Agent处于错误状态' });
  } else if (agent.status === 'idle') {
    checks.push({ name: 'Agent状态', status: 'warning', message: 'Agent处于空闲状态，需要启动' });
  } else {
    checks.push({ name: 'Agent状态', status: 'warning', message: `Agent状态: ${agent.status}` });
  }

  // 检查农场能量
  if (farmState && farmState.energy >= 10) {
    checks.push({ name: '农场能量', status: 'ok', message: `能量充足: ${farmState.energy}` });
  } else if (farmState) {
    checks.push({ name: '农场能量', status: 'warning', message: `能量较低: ${farmState.energy}` });
  } else {
    checks.push({ name: '农场能量', status: 'error', message: '无农场状态' });
  }

  // 检查预授权
  if (agent.paymentAuths && agent.paymentAuths.length > 0) {
    const auth = agent.paymentAuths[0];
    const remaining = Number(auth.authorizedValue - auth.usedValue) / 1e6;
    if (remaining >= 0.001) {
      checks.push({ name: '预授权', status: 'ok', message: `剩余 ${remaining.toFixed(4)} USDC` });
    } else {
      checks.push({ name: '预授权', status: 'warning', message: `余额不足: ${remaining.toFixed(4)} USDC` });
    }
  } else {
    checks.push({ name: '预授权', status: 'warning', message: '无预授权（可能无法使用付费技能）' });
  }

  // 检查最后活跃时间
  if (agent.lastActiveAt) {
    const lastActive = new Date(agent.lastActiveAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActive.getTime()) / 60000;

    if (diffMinutes < 10) {
      checks.push({ name: '最后活跃', status: 'ok', message: `${Math.floor(diffMinutes)} 分钟前活跃` });
    } else if (diffMinutes < 30) {
      checks.push({ name: '最后活跃', status: 'warning', message: `${Math.floor(diffMinutes)} 分钟前活跃` });
    } else {
      checks.push({ name: '最后活跃', status: 'error', message: `${Math.floor(diffMinutes)} 分钟前活跃，可能已停止` });
    }
  } else {
    checks.push({ name: '最后活跃', status: 'warning', message: '从未活跃过' });
  }

  // 输出诊断结果
  for (const check of checks) {
    const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    log(check.status === 'ok' ? 'green' : check.status === 'warning' ? 'yellow' : 'red', 
        `  ${icon} ${check.name}: ${check.message}`);
  }

  // 7. 检查最近的 Agent 日志
  log('cyan', '\n========== 最近 Agent 日志 ==========\n');
  const logs = await prisma.agentLog.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (logs.length > 0) {
    for (const logEntry of logs) {
      const time = logEntry.createdAt.toISOString();
      const icon = logEntry.level === 'error' ? '❌' : logEntry.level === 'warning' ? '⚠️' : 'ℹ️';
      const levelColor = logEntry.level === 'error' ? 'red' : logEntry.level === 'warning' ? 'yellow' : 'blue';
      log(levelColor, `  ${icon} [${time}] ${logEntry.message}`);
    }
  } else {
    log('yellow', '  无日志记录');
  }

  // 8. 检查最近的决策记录
  log('cyan', '\n========== 最近决策记录 ==========\n');
  const decisions = await prisma.agentDecision.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  if (decisions.length > 0) {
    for (const d of decisions) {
      const time = d.createdAt.toISOString();
      const icon = d.success ? '✅' : '❌';
      log('blue', `  ${icon} [${time}]`);
      log('yellow', `     决策: ${JSON.stringify(d.decisions)}`);
      log('yellow', `     推理: ${d.reasoning}`);
      log('yellow', `     执行: ${d.executed ? '已执行' : '待执行'}, 成功: ${d.success}`);
    }
  } else {
    log('yellow', '  无决策记录');
  }

  // 总结
  log('cyan', '\n========== 总结 ==========\n');
  const hasErrors = checks.some(c => c.status === 'error');
  const hasWarnings = checks.some(c => c.status === 'warning');

  if (!hasErrors && !hasWarnings) {
    log('green', '✅ Agent 运行正常！');
  } else if (!hasErrors) {
    log('yellow', '⚠️ Agent 运行正常，但有一些警告需要注意');
  } else {
    log('red', '❌ Agent 可能无法正常运行，请检查上述错误');
  }

  // 9. 尝试调用 agent-tick API
  log('cyan', '\n========== 尝试触发 Agent Tick ==========\n');
  
  const cronSecret = process.env.CRON_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  log('blue', `API URL: ${appUrl}/api/cron/agent-tick`);
  log('blue', `CRON_SECRET: ${cronSecret ? '已配置' : '未配置'}`);

  try {
    const response = await fetch(`${appUrl}/api/cron/agent-tick`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret || 'test'}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      log('green', '\n✅ API 调用成功!');
      log('blue', `响应: ${JSON.stringify(data, null, 2)}`);
    } else {
      log('red', `\n❌ API 调用失败: ${response.status}`);
      log('red', `错误: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error: any) {
    log('red', `\n❌ API 调用异常: ${error.message}`);
    log('yellow', '提示: 请确保开发服务器正在运行 (npm run dev)');
  }

  log('green', '\n========================================');
  log('green', '   测试完成');
  log('green', '========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
