import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 简化版的 calculateGrowthStage
function calculateGrowthStage(plot: any): number {
  if (!plot.plantedAt || !plot.harvestAt) return plot.growthStage;
  
  const now = new Date();
  if (now >= plot.harvestAt) return 4; // 成熟

  const totalDuration = plot.harvestAt.getTime() - plot.plantedAt.getTime();
  const elapsed = now.getTime() - plot.plantedAt.getTime();
  
  if (elapsed <= 0) return 1;

  const progress = elapsed / totalDuration;
  
  if (progress < 0.33) return 1;
  if (progress < 0.66) return 2;
  if (progress < 1.0) return 3;
  
  return 4;
}

const TARGET_WALLET = '0x85902da922876690a7507d6ab83736f261047655';

async function main() {
  // 查询用户
  const user = await prisma.user.findFirst({
    where: {
      walletAddress: {
        equals: TARGET_WALLET.toLowerCase(),
        mode: 'insensitive'
      }
    },
    include: {
      farmState: {
        include: {
          landPlots: { orderBy: { plotIndex: 'asc' } }
        }
      },
      inventory: true,
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('=== Raw Land Plots from DB ===');
  if (user.farmState) {
    for (const plot of user.farmState.landPlots) {
      const currentStage = calculateGrowthStage(plot);
      console.log(`Plot ${plot.plotIndex}:`, {
        cropId: plot.cropId,
        dbGrowthStage: plot.growthStage,
        calculatedStage: currentStage,
        isMature: currentStage >= 4,
        harvestAt: plot.harvestAt?.toISOString(),
        now: new Date().toISOString()
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
