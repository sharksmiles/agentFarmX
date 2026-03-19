import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const WALLET_ADDRESS = '0x7e73e9a05a221054b581c17726cec05abe80fb31';

async function main() {
  console.log('========================================');
  console.log('   测试用户机器人运行状态');
  console.log('========================================\n');

  // 1. 查询用户
  const user = await prisma.user.findUnique({
    where: { walletAddress: WALLET_ADDRESS },
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
        include: { landPlots: true }
      }
    }
  });

  if (!user) {
    console.log('❌ 未找到该用户:', WALLET_ADDRESS);
    return;
  }

  console.log('✓ 用户信息:');
  console.log('  - ID:', user.id);
  console.log('  - 钱包地址:', user.walletAddress);
  console.log('  - 用户名:', user.username);
  console.log('  - 农场币:', user.farmCoins?.toString() || '0');
  console.log('  - 等级:', user.level);
  console.log('  - 创建时间:', user.createdAt);

  // 2. 检查 Agent
  console.log('\n========== Agent 信息 ==========\n');

  if (!user.agents || user.agents.length === 0) {
    console.log('❌ 该用户没有创建 Agent');
    await prisma.$disconnect();
    return;
  }

  for (const agent of user.agents) {
    console.log('🤖 Agent:', agent.name);
    console.log('  - ID:', agent.id);
    console.log('  - 状态:', agent.status);
    console.log('  - 是否活跃:', agent.isActive);
    console.log('  - 策略类型:', agent.strategyType);
    console.log('  - AI模型:', agent.aiModel);
    console.log('  - 最后活跃时间:', agent.lastActiveAt);
    console.log('  - SCA地址:', agent.scaAddress);

    // 检查预授权
    if (agent.paymentAuths && agent.paymentAuths.length > 0) {
      const auth = agent.paymentAuths[0];
      const remaining = auth.authorizedValue - auth.usedValue;
      console.log('  - 预授权状态: 有效');
      console.log('  - 授权额度:', Number(auth.authorizedValue) / 1e6, 'USDC');
      console.log('  - 已使用:', Number(auth.usedValue) / 1e6, 'USDC');
      console.log('  - 剩余:', Number(remaining) / 1e6, 'USDC');
    } else {
      console.log('  - 预授权状态: 无');
    }
  }

  // 3. 检查农场状态
  console.log('\n========== 农场状态 ==========\n');
  if (user.farmState) {
    console.log('  - 能量:', user.farmState.energy, '/', user.farmState.maxEnergy);
    console.log('  - 解锁地块:', user.farmState.unlockedLands);
    console.log('  - 地块数量:', user.farmState.landPlots?.length || 0);

    if (user.farmState.landPlots && user.farmState.landPlots.length > 0) {
      console.log('\n  地块详情:');
      user.farmState.landPlots.forEach(plot => {
        const status = plot.cropId ? `${plot.cropId} (阶段 ${plot.growthStage})` : '空';
        console.log(`    地块 ${plot.plotIndex}: ${status}`);
      });
    }
  } else {
    console.log('  ❌ 无农场状态');
  }

  // 4. 检查最近的 Agent 日志
  console.log('\n========== 最近 Agent 日志 ==========\n');
  const agentIds = user.agents.map(a => a.id);
  
  if (agentIds.length > 0) {
    const logs = await prisma.agentLog.findMany({
      where: { agentId: { in: agentIds } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (logs.length > 0) {
      logs.forEach(log => {
        const time = log.createdAt.toISOString();
        console.log(`  [${time}] [${log.level}] ${log.message}`);
      });
    } else {
      console.log('  无日志记录');
    }

    // 5. 检查最近的决策记录
    console.log('\n========== 最近决策记录 ==========\n');
    const decisions = await prisma.agentDecision.findMany({
      where: { agentId: { in: agentIds } },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (decisions.length > 0) {
      decisions.forEach(decision => {
        const time = decision.createdAt.toISOString();
        console.log(`  [${time}] 模型: ${decision.model}`);
        console.log(`    决策: ${JSON.stringify(decision.decisions)}`);
        console.log(`    推理: ${decision.reasoning}`);
        console.log(`    执行成功: ${decision.success}`);
      });
    } else {
      console.log('  无决策记录');
    }
  }

  // 6. 运行状态诊断
  console.log('\n========== 运行状态诊断 ==========\n');
  
  const agent = user.agents[0];
  
  // 检查各项条件
  const checks: { name: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];
  
  // 检查 Agent 状态
  if (agent.status === 'running' && agent.isActive) {
    checks.push({ name: 'Agent状态', status: 'ok', message: 'Agent正在运行' });
  } else if (agent.status === 'paused') {
    checks.push({ name: 'Agent状态', status: 'warning', message: 'Agent已暂停' });
  } else if (agent.status === 'error') {
    checks.push({ name: 'Agent状态', status: 'error', message: 'Agent处于错误状态' });
  } else if (agent.status === 'idle') {
    checks.push({ name: 'Agent状态', status: 'warning', message: 'Agent处于空闲状态，需要启动' });
  } else {
    checks.push({ name: 'Agent状态', status: 'warning', message: `Agent状态: ${agent.status}` });
  }

  // 检查农场能量
  if (user.farmState && user.farmState.energy >= 10) {
    checks.push({ name: '农场能量', status: 'ok', message: `能量充足: ${user.farmState.energy}` });
  } else if (user.farmState) {
    checks.push({ name: '农场能量', status: 'warning', message: `能量不足: ${user.farmState.energy}` });
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
    checks.push({ name: '预授权', status: 'warning', message: '无预授权记录（可能无法使用付费技能）' });
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
  }

  // 输出诊断结果
  checks.forEach(check => {
    const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  });

  // 总结
  console.log('\n========== 总结 ==========\n');
  const hasErrors = checks.some(c => c.status === 'error');
  const hasWarnings = checks.some(c => c.status === 'warning');

  if (!hasErrors && !hasWarnings) {
    console.log('✅ Agent 运行正常！');
  } else if (!hasErrors) {
    console.log('⚠️ Agent 运行正常，但有一些警告需要注意');
  } else {
    console.log('❌ Agent 可能无法正常运行，请检查上述错误');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
