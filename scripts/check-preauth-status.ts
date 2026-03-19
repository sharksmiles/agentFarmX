import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';

async function main() {
  console.log('========================================');
  console.log('   检查预授权状态');
  console.log('========================================\n');

  // 1. 获取最新的预授权记录
  const auth = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!auth) {
    console.log('❌ 未找到预授权记录');
    await prisma.$disconnect();
    return;
  }

  console.log('最新预授权记录:');
  console.log('  - ID:', auth.id);
  console.log('  - 用户:', auth.userId);
  console.log('  - 授权类型:', auth.authType);
  console.log('  - 授权额度:', Number(auth.authorizedValue) / 1e6, 'USDC');
  console.log('  - 已使用:', Number(auth.usedValue) / 1e6, 'USDC');
  console.log('  - 有效期至:', auth.validBefore);
  console.log('  - Permit2 Nonce:', auth.permit2Nonce);
  console.log('  - 创建时间:', auth.createdAt);

  // 2. 查找预授权相关的日志
  console.log('\n========== 预授权相关日志 ==========\n');
  
  const logs = await prisma.agentLog.findMany({
    where: {
      agentId: AGENT_ID,
      message: { contains: 'Permit2' },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  for (const log of logs) {
    const time = log.createdAt.toISOString();
    const icon = log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${time}] ${log.message}`);
    if (log.metadata) {
      console.log('   Metadata:', JSON.stringify(log.metadata, null, 2));
    }
  }

  // 3. 查找最近的决策执行结果
  console.log('\n========== 最近决策执行结果 ==========\n');
  
  const decisions = await prisma.agentDecision.findMany({
    where: { agentId: AGENT_ID },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const d of decisions) {
    const time = d.createdAt.toISOString();
    const icon = d.success ? '✅' : '❌';
    console.log(`${icon} [${time}]`);
    console.log(`   决策: ${JSON.stringify(d.decisions)}`);
    console.log(`   执行: ${d.executed ? '已执行' : '待执行'}, 成功: ${d.success}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
