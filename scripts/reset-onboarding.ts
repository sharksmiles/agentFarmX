import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 查询当前用户状态...\n');
  
  // 查询所有用户及其相关信息
  const users = await prisma.user.findMany({
    select: {
      id: true,
      walletAddress: true,
      username: true,
      level: true,
      onboardingStep: true,
      createdAt: true,
      farmState: true,
      agents: true,
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`共有 ${users.length} 个用户\n`);
  
  for (const user of users) {
    const hasFarm = !!user.farmState;
    const hasAgent = user.agents.length > 0;
    const isOldUser = hasFarm || user.level > 1;
    
    console.log(`用户: ${user.walletAddress}`);
    console.log(`  - 等级: ${user.level}`);
    console.log(`  - 有农场: ${hasFarm}`);
    console.log(`  - 有Agent: ${hasAgent}`);
    console.log(`  - 当前onboardingStep: ${user.onboardingStep ?? 'null'}`);
    console.log(`  - 是否老用户: ${isOldUser}`);
    console.log('');
  }
  
  // 更新所有用户的 onboardingStep 为 null
  console.log('🔧 正在将所有用户的 onboardingStep 设为 null...\n');
  
  const result = await prisma.user.updateMany({
    data: {
      onboardingStep: null
    }
  });
  
  console.log(`✅ 已更新 ${result.count} 个用户的 onboardingStep 为 null\n`);
  
  // 验证更新结果
  const updatedUsers = await prisma.user.findMany({
    select: {
      walletAddress: true,
      onboardingStep: true,
    }
  });
  
  console.log('=== 更新后的用户状态 ===');
  for (const user of updatedUsers) {
    console.log(`${user.walletAddress}: onboardingStep = ${user.onboardingStep ?? 'null'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
