import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmx6bp67003410f4ycpvie8o'; // Raider Bot

async function main() {
  console.log('========================================');
  console.log('   启动并测试 Agent');
  console.log('========================================\n');

  // 1. 获取 Agent 当前状态
  const agentBefore = await prisma.agent.findUnique({
    where: { id: AGENT_ID },
    include: {
      user: {
        include: {
          farmState: { include: { landPlots: true } }
        }
      },
      paymentAuths: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!agentBefore) {
    console.log('❌ Agent 不存在');
    return;
  }

  console.log('当前 Agent 状态:');
  console.log('  - 名称:', agentBefore.name);
  console.log('  - 状态:', agentBefore.status);
  console.log('  - 是否活跃:', agentBefore.isActive);

  // 2. 启动 Agent
  console.log('\n正在启动 Agent...');
  const agent = await prisma.agent.update({
    where: { id: AGENT_ID },
    data: {
      status: 'running',
      isActive: true,
      lastActiveAt: new Date()
    }
  });

  console.log('✅ Agent 已启动:');
  console.log('  - 状态:', agent.status);
  console.log('  - 是否活跃:', agent.isActive);

  // 3. 检查预授权信息
  console.log('\n========== 预授权信息 ==========\n');
  if (agentBefore.paymentAuths && agentBefore.paymentAuths.length > 0) {
    const auth = agentBefore.paymentAuths[0];
    console.log('  - 授权签名:', auth.signature?.substring(0, 20) + '...');
    console.log('  - 授权额度:', Number(auth.authorizedValue) / 1e6, 'USDC');
    console.log('  - 已使用:', Number(auth.usedValue) / 1e6, 'USDC');
    console.log('  - 有效期至:', auth.validBefore);
    console.log('  - 是否激活:', auth.isActive);
    
    // 检查是否过期
    const now = new Date();
    if (auth.validBefore < now) {
      console.log('  ⚠️ 预授权已过期!');
    } else {
      console.log('  ✅ 预授权有效');
    }
  } else {
    console.log('  ❌ 无预授权记录');
  }

  // 4. 检查农场状态
  console.log('\n========== 农场状态 ==========\n');
  const farmState = agentBefore.user?.farmState;
  if (farmState) {
    console.log('  - 能量:', farmState.energy, '/', farmState.maxEnergy);
    console.log('  - 地块数量:', farmState.landPlots?.length || 0);
    
    const harvestablePlots = farmState.landPlots?.filter(p => p.cropId && p.growthStage >= 4) || [];
    const emptyPlots = farmState.landPlots?.filter(p => !p.cropId) || [];
    
    console.log('  - 可收获地块:', harvestablePlots.length);
    console.log('  - 空地块:', emptyPlots.length);
  }

  // 5. 获取可用技能
  console.log('\n========== 可用技能 ==========\n');
  const skills = await prisma.agentSkill.findMany({
    where: { isActive: true },
    select: { id: true, name: true, displayName: true, category: true, energyCost: true, priceUsdc: true }
  });

  console.log('可用技能数量:', skills.length);
  skills.forEach(s => {
    const price = s.priceUsdc ? ` (${s.priceUsdc} USDC)` : '';
    console.log(`  - ${s.displayName}${price}`);
  });

  // 6. 模拟决策
  console.log('\n========== 模拟决策测试 ==========\n');
  
  // 简单的决策逻辑
  let decision = null;
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
    } else {
      // Raider 策略尝试偷菜
      decision = { skillName: 'steal_crop', parameters: { targetUserId: 'nearby' } };
      reasoning = '[RAIDER] 尝试从附近农场偷菜';
    }
  }

  if (decision) {
    console.log('决策:', JSON.stringify(decision));
    console.log('推理:', reasoning);
    
    // 检查技能是否存在
    const skill = skills.find(s => s.name === decision.skillName);
    if (skill) {
      console.log('\n✅ 技能存在:', skill.displayName);
      console.log('  - 能量消耗:', skill.energyCost);
      console.log('  - 价格:', skill.priceUsdc ? `${skill.priceUsdc} USDC` : '免费');
    } else {
      console.log('\n❌ 技能不存在:', decision.skillName);
    }
  }

  // 7. 调用 agent-tick API
  console.log('\n========== 调用 Agent Tick API ==========\n');
  
  const cronSecret = process.env.CRON_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log('API URL:', `${appUrl}/api/cron/agent-tick`);
  console.log('CRON_SECRET:', cronSecret ? '已配置' : '未配置');
  
  try {
    const response = await fetch(`${appUrl}/api/cron/agent-tick`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret || 'test'}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ API 调用成功!');
      console.log('响应:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ API 调用失败:', response.status);
      console.log('错误:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.log('\n❌ API 调用异常:', error.message);
  }

  // 8. 检查最新日志
  console.log('\n========== 最新 Agent 日志 ==========\n');
  const logs = await prisma.agentLog.findMany({
    where: { agentId: AGENT_ID },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  logs.forEach(log => {
    const time = new Date(log.createdAt).toLocaleTimeString();
    const icon = log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`  ${icon} [${time}] ${log.message}`);
  });

  console.log('\n========================================');
  console.log('   测试完成');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
