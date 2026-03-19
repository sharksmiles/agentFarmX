import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AGENT_ID = 'cmmx6bp67003410f4ycpvie8o'; // Raider Bot

async function main() {
  console.log('========================================');
  console.log('   检查预授权签名详情');
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

  console.log('========== 预授权记录详情 ==========\n');
  console.log('ID:', auth.id);
  console.log('Agent ID:', auth.agentId);
  console.log('User ID:', auth.userId);
  console.log('\n--- 签名信息 ---');
  console.log('签名 (signature):', auth.signature);
  console.log('Nonce:', auth.nonce);
  console.log('\n--- 授权金额 ---');
  console.log('授权额度 (authorizedValue):', Number(auth.authorizedValue) / 1e6, 'USDC');
  console.log('已使用 (usedValue):', Number(auth.usedValue) / 1e6, 'USDC');
  console.log('剩余:', Number(auth.authorizedValue - auth.usedValue) / 1e6, 'USDC');
  console.log('\n--- 时间信息 ---');
  console.log('有效期前 (validAfter):', auth.validAfter);
  console.log('有效期至 (validBefore):', auth.validBefore);
  console.log('创建时间:', auth.createdAt);
  console.log('更新时间:', auth.updatedAt);
  console.log('是否激活:', auth.isActive);
  if (auth.revokedAt) {
    console.log('撤销时间:', auth.revokedAt);
  }

  // 2. 检查用户信息
  const user = await prisma.user.findUnique({
    where: { id: auth.userId }
  });

  console.log('\n========== 用户信息 ==========\n');
  if (user) {
    console.log('钱包地址:', user.walletAddress);
    console.log('用户名:', user.username);
  }

  // 3. 检查 Agent 信息
  const agent = await prisma.agent.findUnique({
    where: { id: AGENT_ID }
  });

  console.log('\n========== Agent 信息 ==========\n');
  if (agent) {
    console.log('名称:', agent.name);
    console.log('SCA 地址:', agent.scaAddress);
    console.log('状态:', agent.status);
    console.log('策略类型:', agent.strategyType);
  }

  // 4. 验证签名格式
  console.log('\n========== 签名格式验证 ==========\n');
  
  const signature = auth.signature;
  if (signature) {
    console.log('签名长度:', signature.length);
    console.log('签名前缀:', signature.startsWith('0x') ? '✅ 以0x开头' : '❌ 不以0x开头');
    
    // 检查签名是否为有效的十六进制
    const hexPattern = /^0x[0-9a-fA-F]+$/;
    const isValidHex = hexPattern.test(signature);
    console.log('十六进制格式:', isValidHex ? '✅ 有效' : '❌ 无效');
    
    // EIP-3009 签名应该是 65 字节 (130 个十六进制字符 + 0x)
    const expectedLength = 132; // 0x + 64 字节 r + 32 字节 s
    console.log('预期长度 (EIP-3009):', expectedLength);
    console.log('实际长度:', signature.length);
    
    if (signature.length === expectedLength) {
      console.log('✅ 签名长度正确');
    } else {
      console.log('⚠️ 签名长度不匹配');
    }
    
    // 提取 v, r, s
    if (signature.length >= 132) {
      const r = signature.slice(0, 66);
      const s = '0x' + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);
      
      console.log('\n签名组成部分:');
      console.log('r:', r);
      console.log('s:', s);
      console.log('v:', v);
    }
  }

  // 5. 检查环境变量
  console.log('\n========== 合约配置 ==========\n');
  console.log('USDC 合约地址:', process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS);
  console.log('网络:', process.env.NEXT_PUBLIC_CHAIN_ID);

  await prisma.$disconnect();
}

main().catch(console.error);
