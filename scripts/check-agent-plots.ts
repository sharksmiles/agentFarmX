import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查 Agent 地块状态 ==========\n');

  // 获取活跃 Agent 及其用户的地块
  const agents = await prisma.agent.findMany({
    where: { isActive: true },
    include: {
      user: {
        include: {
          farmState: {
            include: {
              landPlots: {
                orderBy: { plotIndex: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  for (const agent of agents) {
    console.log(`\n===== Agent: ${agent.name} (${agent.id.slice(0, 8)}...) =====`);
    console.log(`用户ID: ${agent.userId}`);
    
    const farmState = agent.user?.farmState;
    if (!farmState) {
      console.log('  无农场状态!');
      continue;
    }

    console.log(`能量: ${farmState.energy}/${farmState.maxEnergy}`);
    console.log(`地块数量: ${farmState.landPlots.length}`);
    
    console.log('\n地块状态:');
    for (const plot of farmState.landPlots) {
      const status = plot.cropId 
        ? `${plot.cropId} (阶段 ${plot.growthStage})` 
        : '空';
      const harvestable = plot.cropId && plot.growthStage >= 4 ? '✅可收获' : '';
      console.log(`  地块 ${plot.plotIndex}: ${status} ${harvestable}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
