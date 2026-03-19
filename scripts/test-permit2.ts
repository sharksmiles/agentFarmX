import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const WALLET_ADDRESS = '0x7e73e9a05a221054b581c17726cec05abe80fb31';
const AGENT_ID = 'cmmx6bp67003410f4ycpvie8o'; // Raider Bot

async function main() {
  console.log('========================================');
  console.log('   Permit2 预授权测试');
  console.log('========================================\n');

  // 1. 检查 Permit2 服务配置
  console.log('========== Permit2 服务配置 ==========\n');
  
  // Permit2 配置
  const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
  const USDC_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS || '';
  const BACKEND_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || '';
  const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '';
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.xlayer.tech';
  
  // 计算后端钱包地址
  let backendWallet = '';
  if (BACKEND_PRIVATE_KEY) {
    const { Wallet } = await import('ethers');
    const wallet = new Wallet(BACKEND_PRIVATE_KEY);
    backendWallet = wallet.address;
  }
  
  const isConfigured = !!(USDC_ADDRESS && BACKEND_PRIVATE_KEY && PAY_TO_ADDRESS);
  
  console.log('Permit2 地址:', PERMIT2_ADDRESS);
  console.log('USDC 地址:', USDC_ADDRESS || '未设置');
  console.log('后端钱包:', backendWallet || '未设置');
  console.log('收款地址:', PAY_TO_ADDRESS || '未设置');
  console.log('RPC URL:', RPC_URL);
  console.log('是否配置完成:', isConfigured ? '✅' : '❌');

  // 2. 检查用户信息
  console.log('\n========== 用户信息 ==========\n');
  
  const user = await prisma.user.findUnique({
    where: { walletAddress: WALLET_ADDRESS },
    include: {
      agents: {
        include: {
          paymentAuths: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!user) {
    console.log('❌ 未找到用户');
    return;
  }

  console.log('用户钱包地址:', user.walletAddress);
  console.log('用户名:', user.username);

  // 3. 检查 Agent 信息
  console.log('\n========== Agent 信息 ==========\n');
  
  const agent = user.agents.find(a => a.id === AGENT_ID);
  if (!agent) {
    console.log('❌ 未找到 Agent');
    return;
  }

  console.log('Agent 名称:', agent.name);
  console.log('Agent 状态:', agent.status);
  console.log('Agent 是否活跃:', agent.isActive);
  console.log('SCA 地址:', agent.scaAddress);

  // 4. 检查现有预授权
  console.log('\n========== 现有预授权 ==========\n');
  
  const existingAuth = agent.paymentAuths[0];
  if (existingAuth) {
    console.log('预授权 ID:', existingAuth.id);
    console.log('授权类型:', existingAuth.authType);
    console.log('授权额度:', Number(existingAuth.authorizedValue) / 1e6, 'USDC');
    console.log('已使用:', Number(existingAuth.usedValue) / 1e6, 'USDC');
    console.log('剩余:', Number(existingAuth.authorizedValue - existingAuth.usedValue) / 1e6, 'USDC');
    console.log('有效期至:', existingAuth.validBefore);
    console.log('Permit2 Nonce:', existingAuth.permit2Nonce);
    console.log('Permit2 地址:', existingAuth.permit2Address);
    
    const now = new Date();
    const isValid = existingAuth.validBefore > now && existingAuth.isActive;
    console.log('是否有效:', isValid ? '✅' : '❌');
  } else {
    console.log('❌ 无现有预授权');
  }

  // 5. 测试 Permit2 API 端点
  console.log('\n========== 测试 Permit2 API ==========\n');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // 测试获取预授权需求
  try {
    const response = await fetch(`${appUrl}/api/agents/${AGENT_ID}/preauth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('预授权需求 API: ✅');
      console.log('  - 需要预授权:', data.needsPreauth ? '是' : '否');
      console.log('  - 金额:', data.amountUsdc, 'USDC');
    } else {
      console.log('预授权需求 API: ❌', response.status);
    }
  } catch (error: any) {
    console.log('预授权需求 API 错误:', error.message);
  }

  // 6. 总结
  console.log('\n========== 总结 ==========\n');
  
  if (isConfigured) {
    console.log('✅ Permit2 服务已配置');
    console.log('');
    console.log('下一步操作:');
    console.log('1. 前端需要调用 Permit2 预授权流程');
    console.log('2. 用户需要先授权 Permit2 合约使用其 USDC');
    console.log('3. 然后签名 PermitSingle 授权后端钱包');
    console.log('4. 后端收到签名后存储预授权记录');
    console.log('5. Agent 执行付费技能时使用 Permit2 transferFrom');
  } else {
    console.log('❌ Permit2 服务未完整配置');
    console.log('');
    console.log('请检查以下环境变量:');
    console.log('- PAYMENT_TOKEN_ADDRESS:', USDC_ADDRESS || '未设置');
    console.log('- BACKEND_WALLET_PRIVATE_KEY:', backendWallet ? '已设置' : '未设置');
    console.log('- PAY_TO_ADDRESS:', PAY_TO_ADDRESS || '未设置');
  }

  console.log('\n========================================');
  console.log('   测试完成');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
