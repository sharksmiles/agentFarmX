import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';

async function main() {
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

  console.log('预授权记录:');
  console.log('  - ID:', auth.id);
  console.log('  - authType:', auth.authType);
  console.log('  - nonce 字段:', auth.nonce);
  console.log('  - permit2Nonce:', auth.permit2Nonce);
  console.log('  - 创建时间:', auth.createdAt);
  
  // 解析 nonce
  const nonceParts = auth.nonce.split('-');
  console.log('\nnonce 解析:');
  console.log('  - Parts:', nonceParts);
  console.log('  - Parts length:', nonceParts.length);
  
  if (nonceParts.length >= 3) {
    const sigDeadlineStr = nonceParts[2];
    console.log('  - sigDeadline 字符串:', sigDeadlineStr);
    
    const sigDeadline = parseInt(sigDeadlineStr);
    console.log('  - sigDeadline 数字:', sigDeadline);
    
    if (!isNaN(sigDeadline)) {
      console.log('  - sigDeadline 日期:', new Date(sigDeadline * 1000).toISOString());
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
