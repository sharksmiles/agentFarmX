import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ID = 'cmmxg7a6z003zxzea9glcxxeg';

async function main() {
  console.log('检查 ID:', ID);
  
  // 检查是否是 Agent
  const agent = await prisma.agent.findUnique({
    where: { id: ID },
    include: { user: true }
  });
  
  if (agent) {
    console.log('\n✅ 这是一个 Agent ID');
    console.log('Agent 名称:', agent.name);
    console.log('Agent 状态:', agent.status);
    console.log('用户 ID:', agent.userId);
    console.log('用户钱包:', agent.user?.walletAddress);
  } else {
    console.log('\n❌ 不是 Agent ID');
  }
  
  // 检查是否是 User
  const user = await prisma.user.findUnique({
    where: { id: ID },
    include: { agents: true }
  });
  
  if (user) {
    console.log('\n✅ 这是一个 User ID');
    console.log('用户钱包:', user.walletAddress);
    console.log('用户名:', user.username);
    console.log('Agent 数量:', user.agents?.length || 0);
  } else {
    console.log('\n❌ 不是 User ID');
  }
  
  // 列出所有用户
  console.log('\n========== 所有用户 ==========');
  const allUsers = await prisma.user.findMany({
    select: { id: true, walletAddress: true, username: true },
    take: 10
  });
  
  for (const u of allUsers) {
    console.log(`- ${u.id} | ${u.walletAddress} | ${u.username || '未设置'}`);
  }
  
  // 列出所有 Agent
  console.log('\n========== 所有 Agent ==========');
  const allAgents = await prisma.agent.findMany({
    select: { id: true, name: true, status: true, userId: true },
    take: 10
  });
  
  for (const a of allAgents) {
    console.log(`- ${a.id} | ${a.name} | ${a.status} | 用户: ${a.userId}`);
  }
  
  await prisma.$disconnect();
}

main();
