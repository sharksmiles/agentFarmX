import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmx6bp67003410f4ycpvie8o'; // Raider Bot

async function main() {
  console.log('========================================');
  console.log('   诊断链上转账失败原因');
  console.log('========================================\n');

  // 1. 获取预授权详情
  const auth = await prisma.agentPaymentAuth.findFirst({
    where: {
      agentId: AGENT_ID,
      isActive: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!auth) {
    console.log('❌ 未找到预授权记录');
    return;
  }

  console.log('========== 预授权签名参数 ==========\n');
  console.log('签名时的参数:');
  console.log('  - from (用户地址):', auth.userId);
  console.log('  - to (收款地址):', auth.payTo);
  console.log('  - value (签名金额):', Number(auth.authorizedValue) / 1e6, 'USDC');
  console.log('  - validAfter:', auth.validAfter);
  console.log('  - validBefore:', auth.validBefore);
  console.log('  - nonce:', auth.nonce);
  console.log('  - chainId:', auth.chainId);
  console.log('  - asset (合约地址):', auth.asset);

  // 2. 获取技能价格
  const skill = await prisma.agentSkill.findFirst({
    where: { name: 'steal_crop' }
  });

  console.log('\n========== 实际转账参数 ==========\n');
  if (skill && skill.priceUsdc) {
    const actualValue = BigInt(Math.floor(skill.priceUsdc * 1e6));
    console.log('  - 实际转账金额:', skill.priceUsdc, 'USDC');
    console.log('  - 实际转账金额 (微单位):', actualValue.toString());
  }

  // 3. 分析问题
  console.log('\n========== 问题分析 ==========\n');
  
  const signedValue = auth.authorizedValue;
  const actualValueMicro = BigInt(Math.floor((skill?.priceUsdc || 0.001) * 1e6));
  
  console.log('签名中的 value:', Number(signedValue) / 1e6, 'USDC');
  console.log('实际转账 value:', Number(actualValueMicro) / 1e6, 'USDC');
  console.log('');
  
  if (signedValue !== actualValueMicro) {
    console.log('❌ 问题确认: 签名金额与实际转账金额不一致!');
    console.log('');
    console.log('EIP-3009 的 transferWithAuthorization 要求:');
    console.log('  - 签名中的 value 必须与实际转账金额完全一致');
    console.log('  - 当前实现: 签名时使用"授权总额"，转账时使用"单次支付金额"');
    console.log('  - 这导致合约验证签名失败，返回 "invalid signature"');
  } else {
    console.log('✅ 签名金额与实际转账金额一致');
  }

  // 4. 解决方案
  console.log('\n========== 解决方案 ==========\n');
  console.log('方案 1: 禁用链上转账，使用模拟模式');
  console.log('  - 优点: 立即生效，无需用户操作');
  console.log('  - 缺点: 不是真正的链上支付');
  console.log('');
  console.log('方案 2: 每次转账前让用户签名');
  console.log('  - 优点: 真正的链上支付');
  console.log('  - 缺点: 用户体验差，每次都需要签名');
  console.log('');
  console.log('方案 3: 使用 Permit2 合约');
  console.log('  - 优点: 支持真正的预授权，多次转账');
  console.log('  - 缺点: 需要集成 Permit2 合约');

  // 5. 检查当前配置
  console.log('\n========== 当前配置 ==========\n');
  const transferServiceConfigured = !!(process.env.PAYMENT_TOKEN_ADDRESS && process.env.BACKEND_WALLET_PRIVATE_KEY);
  console.log('链上转账服务配置:', transferServiceConfigured ? '已配置 (会尝试链上转账)' : '未配置 (使用模拟模式)');
  console.log('PAYMENT_TOKEN_ADDRESS:', process.env.PAYMENT_TOKEN_ADDRESS || '未设置');
  console.log('BACKEND_WALLET_PRIVATE_KEY:', process.env.BACKEND_WALLET_PRIVATE_KEY ? '已配置' : '未配置');

  console.log('\n========================================');
  console.log('   诊断完成');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
