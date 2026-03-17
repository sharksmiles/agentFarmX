/**
 * 清理 Agent strategyType 字段
 * 将 'farmer' 更新为 'farming'
 * 同时更新 strategyConfig 字段名
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理 Agent 数据...\n');

  // 1. 更新 strategyType: 'farmer' -> 'farming'
  const typeResult = await prisma.$executeRaw`
    UPDATE agents 
    SET "strategyType" = 'farming' 
    WHERE "strategyType" = 'farmer'
  `;
  console.log(`✅ 更新了 ${typeResult} 个 agent 的 strategyType (farmer -> farming)`);

  // 2. 更新 strategyConfig 字段名
  // 获取所有 agent
  const agents = await prisma.agent.findMany({
    select: { id: true, strategyConfig: true },
  });

  let configUpdated = 0;

  for (const agent of agents) {
    const config = agent.strategyConfig as Record<string, any> | null;
    if (!config) continue;

    let needsUpdate = false;
    const newConfig: Record<string, any> = { ...config };

    // 字段名映射
    const fieldMappings: Record<string, string> = {
      'max_daily_gas': 'max_daily_gas_okb',
      'max_daily_usdc': 'max_daily_spend_usdc',
      'stop_balance': 'emergency_stop_balance',
      'max_steals': 'max_daily_steals',
    };

    for (const [oldKey, newKey] of Object.entries(fieldMappings)) {
      if (config[oldKey] !== undefined && config[newKey] === undefined) {
        newConfig[newKey] = config[oldKey];
        delete newConfig[oldKey];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { strategyConfig: newConfig },
      });
      configUpdated++;
    }
  }

  console.log(`✅ 更新了 ${configUpdated} 个 agent 的 strategyConfig 字段名`);

  // 3. 显示清理后的结果
  const stats = await prisma.agent.groupBy({
    by: ['strategyType'],
    _count: true,
  });

  console.log('\n📊 当前 Agent 统计:');
  for (const stat of stats) {
    console.log(`   ${stat.strategyType}: ${stat._count} 个`);
  }

  console.log('\n✨ 清理完成!');
}

main()
  .catch((e) => {
    console.error('❌ 清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
