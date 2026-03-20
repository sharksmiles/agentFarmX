/**
 * Agent Permit2 Pre-authorization Confirm API
 * 
 * POST - 确认 Permit2 预授权签名并提交到链上
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import {
  PERMIT2_ADDRESS,
  getPermit2Allowance,
  getBackendWalletAddress,
  isPermit2Configured,
  submitPermit2Signature,
  PERMIT2_DOMAIN,
  PERMIT2_TYPES,
} from '@/services/permit2Service';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

type AgentParams = { id: string };

interface Permit2PreauthConfirmRequest {
  permit2Version: number;
  scheme: 'permit2';
  network: string;
  payload: {
    signature: string;
    permitSingle: {
      details: {
        token: string;
        amount: string;
        expiration: string;
        nonce: number;
      };
      spender: string;
      sigDeadline: string;
    };
  };
}

/**
 * POST /api/agents/[id]/preauth/permit2 - 确认 Permit2 预授权签名
 */
export const POST = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const body: Permit2PreauthConfirmRequest = await request.json();

    // 检查 Permit2 是否配置
    if (!isPermit2Configured()) {
      return NextResponse.json(
        { error: 'Permit2 service not configured' },
        { status: 500 }
      );
    }

    // 验证 Agent 所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: { walletAddress: true }
        }
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { payload } = body;

    if (!payload?.signature || !payload?.permitSingle) {
      return NextResponse.json({ error: 'Invalid Permit2 payload' }, { status: 400 });
    }

    const { permitSingle } = payload;
    const { details } = permitSingle;

    // 验证必要字段
    if (!details.token || !details.amount || !details.expiration || details.nonce === undefined) {
      return NextResponse.json({ error: 'Missing Permit2 details fields' }, { status: 400 });
    }

    if (!permitSingle.spender || !permitSingle.sigDeadline) {
      return NextResponse.json({ error: 'Missing Permit2 spender or sigDeadline' }, { status: 400 });
    }

    // 验证 spender 是后端钱包
    const backendWallet = getBackendWalletAddress();
    if (permitSingle.spender.toLowerCase() !== backendWallet.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid spender address' },
        { status: 400 }
      );
    }

    // 检查过期时间是否合理（不超过31天）
    const now = Math.floor(Date.now() / 1000);
    const expirationTimestamp = parseInt(details.expiration);
    const maxValidity = 31 * 24 * 60 * 60; // 31天

    if (expirationTimestamp - now > maxValidity) {
      return NextResponse.json({ error: 'Validity period too long' }, { status: 400 });
    }

    // 验证签名过期时间
    const sigDeadline = parseInt(permitSingle.sigDeadline);
    if (sigDeadline < now) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 400 });
    }

    // 构建 PermitSingle 对象（用于签名验证和链上提交）
    const permitSingleForChain = {
      details: {
        token: details.token,
        amount: BigInt(details.amount),
        expiration: parseInt(details.expiration),
        nonce: details.nonce,
      },
      spender: permitSingle.spender,
      sigDeadline: BigInt(permitSingle.sigDeadline),
    };

    // 从签名中恢复签名者地址
    let signerAddress: string;
    try {
      signerAddress = ethers.verifyTypedData(
        PERMIT2_DOMAIN,
        PERMIT2_TYPES,
        permitSingleForChain,
        payload.signature
      ).toLowerCase();
      console.log(`[Permit2 Preauth] Recovered signer address: ${signerAddress}`);
    } catch (error: any) {
      console.error(`[Permit2 Preauth] Failed to recover signer: ${error.message}`);
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 400 });
    }

    // 获取用户钱包地址（用于验证所有权）
    const userWalletAddress = agent.user?.walletAddress?.toLowerCase();
    
    // 验证签名者地址与数据库中的钱包地址匹配
    if (userWalletAddress && signerAddress !== userWalletAddress) {
      console.error(`[Permit2 Preauth] Signer address mismatch:`);
      console.error(`  - Database wallet: ${userWalletAddress}`);
      console.error(`  - Signature signer: ${signerAddress}`);
      
      return NextResponse.json({
        success: false,
        error: '钱包地址不匹配',
        details: {
          expectedWallet: userWalletAddress,
          actualSigner: signerAddress,
          message: `请使用登录时的钱包地址签名。登录钱包: ${userWalletAddress?.slice(0, 6)}...${userWalletAddress?.slice(-4)}，当前签名钱包: ${signerAddress.slice(0, 6)}...${signerAddress.slice(-4)}`
        }
      }, { status: 400 });
    }

    // 使用签名者地址作为 owner

    // 立即提交签名到 Permit2 合约
    console.log(`[Permit2 Preauth] Submitting signature to chain for agent ${agentId}`);
    const permitResult = await submitPermit2Signature(
      signerAddress,
      permitSingleForChain,
      payload.signature
    );

    if (!permitResult.success) {
      console.error(`[Permit2 Preauth] Failed to submit signature: ${permitResult.error}`);
      // 签名提交失败，但仍然存储预授权记录（可能稍后重试）
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'warning',
          message: `Permit2 signature submission failed: ${permitResult.error}. Pre-auth stored for retry.`,
          metadata: {
            error: permitResult.error,
            permit2Nonce: details.nonce,
          },
        },
      });
    } else {
      console.log(`[Permit2 Preauth] Signature submitted successfully: ${permitResult.txHash}`);
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'info',
          message: `Permit2 signature submitted to chain: ${permitResult.txHash}`,
          metadata: {
            txHash: permitResult.txHash,
            blockNumber: permitResult.blockNumber,
            permit2Nonce: details.nonce,
          },
        },
      });
    }

    // 存储预授权（使用 Permit2 格式）
    // 将 sigDeadline 存储在 nonce 字段中: permit2-${nonce}-${sigDeadline}
    // 注意：前端可能传毫秒或秒，需要统一转换为秒
    const sigDeadlineValue = parseInt(permitSingle.sigDeadline);
    const sigDeadlineSeconds = sigDeadlineValue > 1e12 
      ? Math.floor(sigDeadlineValue / 1000)  // 毫秒转秒
      : sigDeadlineValue;  // 已经是秒
    
    const paymentAuth = await prisma.agentPaymentAuth.create({
      data: {
        userId: signerAddress, // 使用签名者地址
        agentId,
        signature: payload.signature,
        nonce: `permit2-${details.nonce}-${sigDeadlineSeconds}`, // 存储秒格式的 sigDeadline
        authorizedValue: BigInt(details.amount),
        usedValue: BigInt(0),
        validAfter: new Date(now * 1000),
        validBefore: new Date(expirationTimestamp * 1000),
        chainId: parseInt(body.network.replace(/\D/g, '')) || 196,
        asset: details.token,
        payTo: permitSingle.spender,
        isActive: true,
        // Permit2 特有字段
        permit2Nonce: details.nonce,
        permit2Address: PERMIT2_ADDRESS,
        authType: 'permit2',
      },
    });

    // 记录日志
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message: `Permit2 pre-authorization created: ${Number(details.amount) / 1e6} USDC, valid until ${new Date(expirationTimestamp * 1000).toISOString()}`,
        metadata: {
          authId: paymentAuth.id,
          authorizedValue: details.amount,
          validBefore: expirationTimestamp,
          permit2Nonce: details.nonce,
          chainTxHash: permitResult.txHash,
        },
      },
    });

    return NextResponse.json({
      success: true,
      auth: {
        id: paymentAuth.id,
        authorizedValue: paymentAuth.authorizedValue.toString(),
        validBefore: paymentAuth.validBefore.toISOString(),
        permit2Nonce: details.nonce,
        chainTxHash: permitResult.txHash,
        chainSubmitted: permitResult.success,
        message: permitResult.success 
          ? 'Permit2 预授权成功，已提交到链上，有效期30天'
          : 'Permit2 预授权已存储，但链上提交失败，请稍后重试',
      },
    });
  } catch (error) {
    console.error('POST /api/agents/[id]/preauth/permit2 error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
