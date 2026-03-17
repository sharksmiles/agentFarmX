import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 查询所有用户
  const users = await prisma.user.findMany({
    select: {
      id: true,
      walletAddress: true,
      username: true,
      level: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('=== 数据库中的所有用户 ===');
  console.log(JSON.stringify(users, null, 2));
  
  // 查询最近的 social_actions
  const actions = await prisma.socialAction.findMany({
    where: { actionType: { in: ['steal', 'water'] } },
    select: {
      id: true,
      actionType: true,
      fromUserId: true,
      toUserId: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n=== 最近的 steal/water 记录 ===');
  console.log(JSON.stringify(actions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
