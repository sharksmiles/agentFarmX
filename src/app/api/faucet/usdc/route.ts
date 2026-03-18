import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * POST /api/faucet/usdc - 空投测试FX给用户
 * 仅用于测试环境
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { auth: AuthContext }
) => {
  try {
    // 检查环境变量配置
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    const backendKey = process.env.BACKEND_WALLET_PRIVATE_KEY;

    if (!usdcAddress || !backendKey) {
      return NextResponse.json({
        error: 'USDC faucet not configured',
        message: 'Please deploy FarmXToken contract and configure environment variables',
      }, { status: 503 });
    }

    const userId = context.auth.userId;
    const body = await request.json();
    const { address, amount = 100 } = body; // 默认空投100 FX

    if (!address) {
      return NextResponse.json({
        error: 'Address is required',
      }, { status: 400 });
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({
        error: 'Invalid address format',
      }, { status: 400 });
    }

    // 动态导入ethers
    const { ethers, JsonRpcProvider, Wallet, Contract } = await import('ethers');

    const RPC_URL = process.env.XLAYER_TESTNET_RPC || 'https://testrpc.xlayer.tech';
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(backendKey, provider);

    // FarmXToken ABI（仅包含mint）
    const USDC_ABI = [
      'function mint(address to, uint256 amount) external',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const usdc = new Contract(usdcAddress, USDC_ABI, wallet);

    // 检查当前余额
    const currentBalance = await usdc.balanceOf(address);
    const decimals = await usdc.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // 执行空投
    const tx = await usdc.mint(address, amountWei);
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      return NextResponse.json({
        error: 'Mint transaction failed',
      }, { status: 500 });
    }

    // 获取新余额
    const newBalance = await usdc.balanceOf(address);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      address,
      amount,
      previousBalance: ethers.formatUnits(currentBalance, decimals),
      newBalance: ethers.formatUnits(newBalance, decimals),
    });

  } catch (error: any) {
    console.error('USDC faucet error:', error);
    return NextResponse.json({
      error: 'Faucet failed',
      message: error.message || 'Unknown error',
    }, { status: 500 });
  }
});

/**
 * GET /api/faucet/usdc - 获取FX合约配置信息
 */
export const GET = async () => {
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
  const backendKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  const payToAddress = process.env.PAY_TO_ADDRESS;

  return NextResponse.json({
    configured: !!(usdcAddress && backendKey),
    usdcAddress: usdcAddress || null,
    payToAddress: payToAddress || null,
    network: process.env.XLAYER_TESTNET_RPC ? 'xlayer-testnet' : 'xlayer-mainnet',
  });
};
