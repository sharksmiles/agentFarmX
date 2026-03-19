import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('   修复错误的 SCA 地址');
  console.log('========================================\n');

  // 1. 查找所有以 0xr 开头的错误地址
  const invalidAgents = await prisma.agent.findMany({
    where: {
      scaAddress: { startsWith: '0xr' }
    },
    select: { id: true, name: true, scaAddress: true }
  });

  console.log(`找到 ${invalidAgents.length} 个需要修复的 Agent:\n`);
  invalidAgents.forEach(a => {
    console.log(`  - ${a.name}: ${a.scaAddress}`);
  });

  // 2. 修复每个 Agent 的地址
  console.log('\n正在修复...\n');
  
  for (const agent of invalidAgents) {
    const newAddress = agent.scaAddress.replace('0xr', '0xe');
    await prisma.agent.update({
      where: { id: agent.id },
      data: { scaAddress: newAddress }
    });
    console.log(`  ✓ ${agent.name}: ${agent.scaAddress} -> ${newAddress}`);
  }

  // 3. 验证修复结果
  console.log('\n验证修复结果:\n');
  
  const fixedAgents = await prisma.agent.findMany({
    where: { id: { in: invalidAgents.map(a => a.id) } },
    select: { name: true, scaAddress: true }
  });

  fixedAgents.forEach(a => {
    const isValid = /^0x[0-9a-fA-F]{40}$/.test(a.scaAddress);
    const icon = isValid ? '✅' : '❌';
    console.log(`  ${icon} ${a.name}: ${a.scaAddress}`);
  });

  console.log('\n========================================');
  console.log('   修复完成');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
