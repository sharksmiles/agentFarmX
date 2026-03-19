import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmx6bp67003410f4ycpvie8o';

async function main() {
  console.log('========================================');
  console.log('   撤销 Agent 预授权');
  console.log('========================================\n');

  // 撤销该Agent的所有预授权
  const result = await prisma.agentPaymentAuth.updateMany({
    where: {
      agentId: AGENT_ID,
      isActive: true
    },
    data: {
      isActive: false,
      revokedAt: new Date()
    }
  });

  console.log('已撤销预授权记录数:', result.count);

  // 验证
  const remaining = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true
    }
  });

  console.log('剩余有效预授权:', remaining ? '有' : '无');

  // 1. 获取 Agent 信息
  const agent = await prisma.agent.findUnique({
    where: { id: AGENT_ID },
    select: { id: true, name: true, status: true, strategyConfig: true }
  });

  console.log('\n========== Agent 信息 ==========');
  console.log('ID:', agent?.id);
  console.log('名称:', agent?.name);
  console.log('状态:', agent?.status);

  // 2. 获取所有活跃的付费技能
  const paidSkills = await prisma.agentSkill.findMany({
    where: {
      priceUsdc: { gt: 0 },
      isActive: true,
    },
    select: { id: true, name: true, displayName: true, priceUsdc: true }
  });

  console.log('\n========== 所有付费技能 (priceUsdc > 0) ==========');
  console.log('数量:', paidSkills.length);
  paidSkills.forEach(s => console.log('  -', s.name, '| 价格:', s.priceUsdc, 'USDC'));

  // 3. 获取 Agent 策略配置中的 activeSkills
  if (agent?.strategyConfig) {
    const config = agent.strategyConfig as any;
    console.log('\n========== Agent 策略配置 ==========');
    console.log('activeSkills:', config.activeSkills);

    if (config.activeSkills && config.activeSkills.length > 0) {
      const agentSkills = await prisma.agentSkill.findMany({
        where: { name: { in: config.activeSkills } },
        select: { name: true, displayName: true, priceUsdc: true, isActive: true }
      });

      console.log('\n========== Agent 的 Active Skills 详情 ==========');
      agentSkills.forEach(s => {
        console.log('  -', s.name, '| 价格:', s.priceUsdc || 0, 'USDC', '| 活跃:', s.isActive);
      });
      
      // 检查是否有付费技能
      const hasPaidSkills = agentSkills.some(s => s.priceUsdc && s.priceUsdc > 0);
      console.log('\n是否有付费技能:', hasPaidSkills ? '✅ 是' : '❌ 否');
    }
  }

  // 4. 检查预授权状态
  const validAuth = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true,
      validBefore: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n========== 预授权状态 ==========');
  if (validAuth) {
    console.log('授权额度:', Number(validAuth.authorizedValue) / 1e6, 'USDC');
    console.log('已使用:', Number(validAuth.usedValue) / 1e6, 'USDC');
    console.log('剩余:', Number(validAuth.authorizedValue - validAuth.usedValue) / 1e6, 'USDC');
    console.log('有效期至:', validAuth.validBefore);
    console.log('是否过期:', validAuth.validBefore < new Date() ? '❌ 已过期' : '✅ 有效');
  } else {
    console.log('❌ 无有效预授权');
  }

  // 5. 分析为什么不需要重新授权
  console.log('\n========== 分析结论 ==========');
  if (paidSkills.length === 0) {
    console.log('✅ 系统中没有任何付费技能，所以不需要预授权');
  } else if (agent?.strategyConfig) {
    const config = agent.strategyConfig as any;
    if (!config.activeSkills || config.activeSkills.length === 0) {
      console.log('✅ Agent 没有配置 activeSkills，所以不需要预授权');
    } else {
      const agentSkills = await prisma.agentSkill.findMany({
        where: { name: { in: config.activeSkills } },
        select: { priceUsdc: true }
      });
      const hasPaidSkills = agentSkills.some(s => s.priceUsdc && s.priceUsdc > 0);
      if (!hasPaidSkills) {
        console.log('✅ Agent 的 activeSkills 都是免费技能，所以不需要预授权');
      } else if (validAuth) {
        const remaining = validAuth.authorizedValue - validAuth.usedValue;
        const minRequired = BigInt(Math.floor(0.001 * 1e6));
        if (remaining >= minRequired) {
          console.log('✅ Agent 有有效的预授权且额度充足，所以不需要重新授权');
        } else {
          console.log('⚠️ 预授权额度不足，理论上应该需要重新授权');
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
