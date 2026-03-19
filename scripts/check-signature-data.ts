import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';

async function main() {
  console.log('========================================');
  console.log('   检查原始签名数据');
  console.log('========================================\n');

  const auth = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true,
      authType: 'permit2',
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
  console.log('  - 创建时间:', auth.createdAt);
  console.log('  - 创建时间戳:', Math.floor(auth.createdAt.getTime() / 1000));
  console.log('  - 签名 (前100字符):', auth.signature.substring(0, 100));
  console.log('  - Nonce:', auth.nonce);
  console.log('  - Permit2 Nonce:', auth.permit2Nonce);

  // 解析 nonce 字符串获取可能的 sigDeadline
  // nonce 格式: permit2-${nonce}-${timestamp}
  const nonceParts = auth.nonce.split('-');
  if (nonceParts.length >= 3) {
    const timestampFromNonce = parseInt(nonceParts[2]);
    console.log('  - Nonce 中的时间戳:', timestampFromNonce);
    console.log('  - Nonce 时间戳对应时间:', new Date(timestampFromNonce).toISOString());
  }

  await prisma.$disconnect();
}

main().catch(console.error);
