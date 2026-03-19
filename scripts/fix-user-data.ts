import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_WALLET = '0x85902da922876690a7507d6ab83736f261047655';

async function main() {
  console.log('🔍 查询用户数据...\n');

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
          landPlots: {
            orderBy: { plotIndex: 'asc' }
          }
        }
      },
      inventory: true,
    }
  });

  if (!user) {
    console.log('❌ 用户不存在');
    return;
  }

  console.log('=== 用户基本信息 ===');
  console.log(`ID: ${user.id}`);
  console.log(`钱包地址: ${user.walletAddress}`);
  console.log(`用户名: ${user.username}`);
  console.log(`等级: ${user.level}`);
  console.log(`经验: ${user.experience}`);
  console.log(`金币: ${user.farmCoins}`);
  console.log(`Onboarding Step: ${user.onboardingStep}`);
  console.log('');

  console.log('=== 农场状态 ===');
  if (user.farmState) {
    console.log(`能量: ${user.farmState.energy}/${user.farmState.maxEnergy}`);
    console.log(`解锁地块数: ${user.farmState.unlockedLands}`);
    console.log('');

    console.log('=== 地块状态 ===');
    for (const plot of user.farmState.landPlots) {
      const now = new Date();
      const isMature = plot.harvestAt && now >= plot.harvestAt;
      console.log(`地块 ${plot.plotIndex}: cropId=${plot.cropId || 'null'}, growthStage=${plot.growthStage}, isMature=${isMature}, harvestAt=${plot.harvestAt?.toISOString() || 'null'}`);
    }
  }
  console.log('');

  console.log('=== 库存 ===');
  for (const item of user.inventory) {
    console.log(`${item.itemType}/${item.itemId}: ${item.quantity}`);
  }
  console.log('');

  // 分析问题并修复
  console.log('🔧 开始修复数据...\n');

  const now = new Date();
  const fixes: string[] = [];

  // 修复1: 检查 onboardingStep
  if (user.onboardingStep === 0) {
    fixes.push('设置 onboardingStep = 1');
  }

  // 修复2: 检查是否有预种植的成熟作物（地块0）
  const firstPlot = user.farmState?.landPlots.find(p => p.plotIndex === 0);
  const hasMatureCrop = firstPlot && firstPlot.cropId && firstPlot.harvestAt && now >= firstPlot.harvestAt;

  if (!hasMatureCrop && (user.onboardingStep ?? 0) < 5) {
    fixes.push('在地块0预种植已成熟的 Wheat 作物');
  }

  // 修复3: 检查是否有种子库存
  const hasSeeds = user.inventory.some(i => i.itemType === 'crop' && i.itemId === 'Wheat' && i.quantity > 0);
  if (!hasSeeds) {
    fixes.push('添加 5 个 Wheat 种子到库存');
  }

  // 修复4: 检查 boost 库存
  const hasBoost = user.inventory.some(i => i.itemType === 'boost' && i.quantity > 0);
  if (!hasBoost) {
    fixes.push('添加 3 个每日 boost');
  }

  if (fixes.length === 0) {
    console.log('✅ 用户数据正常，无需修复');
    return;
  }

  console.log('待修复项目:');
  fixes.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  // 执行修复
  await prisma.$transaction(async (tx) => {
    // 修复 onboardingStep
    if (user.onboardingStep === 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { onboardingStep: 1 }
      });
      console.log('✅ 已设置 onboardingStep = 1');
    }

    // 修复预种植作物
    if (!hasMatureCrop && (user.onboardingStep ?? 0) < 5 && user.farmState) {
      const plantedAt = new Date(now.getTime() - 6 * 60 * 1000); // 6分钟前种植
      const harvestAt = new Date(now.getTime() - 1000); // 已成熟

      if (firstPlot) {
        await tx.landPlot.update({
          where: { id: firstPlot.id },
          data: {
            cropId: 'Wheat',
            plantedAt,
            harvestAt,
            growthStage: 4,
            lastWateredAt: plantedAt,
            nextWateringDue: null,
          }
        });
      } else {
        await tx.landPlot.create({
          data: {
            farmStateId: user.farmState.id,
            plotIndex: 0,
            isUnlocked: true,
            cropId: 'Wheat',
            plantedAt,
            harvestAt,
            growthStage: 4,
            lastWateredAt: plantedAt,
            nextWateringDue: null,
          }
        });
      }
      console.log('✅ 已在地块0预种植已成熟的 Wheat');
    }

    // 修复种子库存
    if (!hasSeeds) {
      await tx.inventory.upsert({
        where: {
          userId_itemType_itemId: {
            userId: user.id,
            itemType: 'crop',
            itemId: 'Wheat'
          }
        },
        update: { quantity: 5 },
        create: {
          userId: user.id,
          itemType: 'crop',
          itemId: 'Wheat',
          quantity: 5
        }
      });
      console.log('✅ 已添加 5 个 Wheat 种子');
    }

    // 修复 boost 库存
    if (!hasBoost) {
      await tx.inventory.upsert({
        where: {
          userId_itemType_itemId: {
            userId: user.id,
            itemType: 'boost',
            itemId: 'daily_boost'
          }
        },
        update: { quantity: 3 },
        create: {
          userId: user.id,
          itemType: 'boost',
          itemId: 'daily_boost',
          quantity: 3
        }
      });
      console.log('✅ 已添加 3 个每日 boost');
    }
  });

  console.log('\n🎉 数据修复完成！');

  // 显示修复后的数据
  console.log('\n=== 修复后的用户数据 ===');
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      farmState: {
        include: {
          landPlots: {
            orderBy: { plotIndex: 'asc' }
          }
        }
      },
      inventory: true,
    }
  });

  if (updatedUser) {
    console.log(`Onboarding Step: ${updatedUser.onboardingStep}`);
    console.log(`库存:`);
    for (const item of updatedUser.inventory) {
      console.log(`  ${item.itemType}/${item.itemId}: ${item.quantity}`);
    }
    if (updatedUser.farmState) {
      const firstPlot = updatedUser.farmState.landPlots[0];
      console.log(`地块0: cropId=${firstPlot?.cropId || 'null'}, growthStage=${firstPlot?.growthStage}, harvestAt=${firstPlot?.harvestAt?.toISOString() || 'null'}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
