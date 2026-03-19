import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';

async function main() {
  console.log('========================================');
  console.log('   重新提交 Permit2 签名到链上');
  console.log('========================================\n');

  // 动态导入 Permit2 服务
  const permit2Module = await import('../src/services/permit2Service');
  const { submitPermit2Signature, getPermit2Allowance, getBackendWalletAddress, isPermit2Configured } = permit2Module;

  // 1. 获取预授权记录
  const auth = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true,
      authType: 'permit2',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!auth) {
    console.log('❌ 未找到 Permit2 预授权记录');
    await prisma.$disconnect();
    return;
  }

  console.log('预授权记录:');
  console.log('  - ID:', auth.id);
  console.log('  - 用户:', auth.userId);
  console.log('  - 授权额度:', Number(auth.authorizedValue) / 1e6, 'USDC');
  console.log('  - 已使用:', Number(auth.usedValue) / 1e6, 'USDC');
  console.log('  - 有效期至:', auth.validBefore);
  console.log('  - Permit2 Nonce:', auth.permit2Nonce);
  console.log('  - 创建时间:', auth.createdAt);

  // 2. 检查链上授权状态
  console.log('\n========== 检查链上授权状态 ==========\n');

  if (!isPermit2Configured()) {
    console.log('❌ Permit2 服务未配置');
    await prisma.$disconnect();
    return;
  }

  const backendWallet = getBackendWalletAddress();
  console.log('后端钱包地址:', backendWallet);

  try {
    const allowance = await getPermit2Allowance(
      auth.userId,
      auth.asset,
      backendWallet
    );
    
    console.log('链上授权状态:');
    console.log('  - 授权额度:', Number(allowance.amount) / 1e6, 'USDC');
    console.log('  - 过期时间:', new Date(allowance.expiration * 1000).toISOString());
    console.log('  - Nonce:', allowance.nonce);

    if (allowance.amount > 0) {
      console.log('\n✅ 链上已有授权，无需重新提交');
      await prisma.$disconnect();
      return;
    }
  } catch (error: any) {
    console.log('❌ 查询链上授权失败:', error.message);
  }

  // 3. 尝试提交签名
  console.log('\n========== 尝试提交签名 ==========\n');
  
  const now = Math.floor(Date.now() / 1000);
  const sigDeadline = Math.floor(auth.createdAt.getTime() / 1000) + 300; // 创建时间 + 5分钟

  console.log('当前时间:', new Date().toISOString());
  console.log('签名创建时间:', auth.createdAt.toISOString());
  console.log('估计的 sigDeadline:', new Date(sigDeadline * 1000).toISOString());
  
  if (now > sigDeadline) {
    console.log('\n❌ 签名已过期，无法提交到链上');
    console.log('   解决方案: 用户需要在前端重新进行预授权');
    console.log('   修复后的流程会在预授权时立即提交签名到链上');
    await prisma.$disconnect();
    return;
  }

  // 构建 PermitSingle
  const permitSingle = {
    details: {
      token: auth.asset,
      amount: BigInt(auth.authorizedValue.toString()),
      expiration: Math.floor(auth.validBefore.getTime() / 1000),
      nonce: auth.permit2Nonce || 0,
    },
    spender: auth.payTo,
    sigDeadline: BigInt(sigDeadline),
  };

  console.log('\n尝试提交签名...');
  
  const result = await submitPermit2Signature(
    auth.userId,
    permitSingle,
    auth.signature
  );

  if (result.success) {
    console.log('\n✅ 签名提交成功!');
    console.log('  交易哈希:', result.txHash);
    console.log('  区块高度:', result.blockNumber);
  } else {
    console.log('\n❌ 签名提交失败:', result.error);
    console.log('\n解决方案: 用户需要在前端重新进行预授权');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
