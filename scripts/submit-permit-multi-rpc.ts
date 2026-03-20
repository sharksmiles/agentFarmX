import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';

const prisma = new PrismaClient();

const AGENT_ID = 'cmmxg7a6z003zxzea9glcxxeg';

// 多个 RPC 节点（按延迟从低到高排序）
// 数据来源：2026-03-20 测试结果
const RPC_URLS = [
  // 低延迟节点 (~0.107s)
  'https://okx-xlayer.rpc.blxrbdn.com',
  'https://flap-xlayer.rpc.blxrbdn.com',
  'https://rpc.xlayer.tech',
  // 中等延迟节点 (~0.114-0.124s)
  'https://xlayer.rpc.blxrbdn.com',
  'https://xlayerrpc.okx.com',
  'https://xlayer.drpc.org',
  // 较高延迟节点 (~0.224-0.269s)
  'https://rpc.sento.io/xyz/xlayer-mainnet',
];

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

const PERMIT2_ABI = [
  'function permit(address owner, ((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes signature) external',
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
];

async function main() {
  console.log('========================================');
  console.log('   使用多 RPC 节点提交 Permit2 签名');
  console.log('========================================\n');

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
    console.log('❌ 未找到预授权记录');
    await prisma.$disconnect();
    return;
  }

  console.log('预授权记录:');
  console.log('  - ID:', auth.id);
  console.log('  - 用户:', auth.userId);
  console.log('  - 授权额度:', Number(auth.authorizedValue) / 1e6, 'USDC');
  console.log('  - Permit2 Nonce:', auth.permit2Nonce);
  console.log('  - 创建时间:', auth.createdAt);

  const backendPrivateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  if (!backendPrivateKey) {
    console.log('❌ BACKEND_WALLET_PRIVATE_KEY 未配置');
    await prisma.$disconnect();
    return;
  }

  // 2. 尝试不同的 RPC 节点
  for (let i = 0; i < RPC_URLS.length; i++) {
    const rpcUrl = RPC_URLS[i];
    console.log(`\n========== 尝试 RPC ${i + 1}/${RPC_URLS.length}: ${rpcUrl} ==========\n`);

    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const wallet = new Wallet(backendPrivateKey, provider);
      const permit2Contract = new Contract(PERMIT2_ADDRESS, PERMIT2_ABI, wallet);

      // 检查链上授权状态
      console.log('检查链上授权状态...');
      const [amount, expiration, nonce] = await permit2Contract.allowance(
        auth.userId,
        auth.asset,
        wallet.address
      );
      
      console.log('  - 授权额度:', Number(amount) / 1e6, 'USDC');
      console.log('  - 过期时间:', new Date(Number(expiration) * 1000).toISOString());
      console.log('  - Nonce:', Number(nonce));

      if (Number(amount) > 0) {
        console.log('\n✅ 链上已有授权！');
        await prisma.$disconnect();
        return;
      }

      // 尝试提交签名
      console.log('\n尝试提交签名...');
      
      // 从 nonce 字段解析 sigDeadline: permit2-${nonce}-${sigDeadline}
      const nonceParts = auth.nonce.split('-');
      let storedSigDeadline = Math.floor(auth.createdAt.getTime() / 1000) + 3600; // 默认值
      
      if (nonceParts.length >= 3) {
        const parsedValue = parseInt(nonceParts[2]);
        // 如果值大于 1e12，说明是毫秒，需要转换为秒
        storedSigDeadline = parsedValue > 1e12 
          ? Math.floor(parsedValue / 1000)
          : parsedValue;
      }

      const permitSingle = {
        details: {
          token: auth.asset,
          amount: BigInt(auth.authorizedValue.toString()),
          expiration: Math.floor(auth.validBefore.getTime() / 1000),
          nonce: auth.permit2Nonce || 0,
        },
        spender: auth.payTo,
        sigDeadline: BigInt(storedSigDeadline),
      };

      console.log('  - sigDeadline:', new Date(storedSigDeadline * 1000).toISOString());
      console.log('  - 当前时间:', new Date().toISOString());

      const now = Math.floor(Date.now() / 1000);
      if (now > storedSigDeadline) {
        console.log('❌ 签名已过期');
        continue;
      }

      // 设置超时
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 30s')), 30000);
      });

      const txPromise = permit2Contract.permit(auth.userId, permitSingle, auth.signature);

      const tx = await Promise.race([txPromise, timeoutPromise]) as any;
      
      console.log('交易已发送:', tx.hash);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        console.log('❌ 交易执行失败');
        continue;
      }

      console.log('\n✅ 签名提交成功！');
      console.log('  - 交易哈希:', tx.hash);
      console.log('  - 区块高度:', receipt.blockNumber);

      // 验证授权状态
      const [newAmount] = await permit2Contract.allowance(
        auth.userId,
        auth.asset,
        wallet.address
      );
      console.log('  - 新授权额度:', Number(newAmount) / 1e6, 'USDC');

      await prisma.$disconnect();
      return;

    } catch (error: any) {
      console.log('❌ 失败:', error.message?.substring(0, 200) || error);
      
      // 如果是网络错误，继续尝试下一个节点
      if (error.message?.includes('ECONNRESET') || 
          error.message?.includes('timeout') ||
          error.message?.includes('ETIMEDOUT')) {
        console.log('   网络错误，尝试下一个节点...');
        continue;
      }
      
      // 如果是其他错误（如签名过期），不需要继续尝试
      if (error.message?.includes('AllowanceExpired') || 
          error.message?.includes('0x815e1d64')) {
        console.log('   签名已过期，需要重新授权');
        break;
      }
    }
  }

  console.log('\n❌ 所有 RPC 节点都失败了');
  console.log('解决方案: 请在前端重新进行预授权');

  await prisma.$disconnect();
}

main().catch(console.error);
