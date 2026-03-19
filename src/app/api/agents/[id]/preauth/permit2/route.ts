/**
 * Agent Permit2 Pre-authorization Confirm API
 * 
 * POST - 确认 Permit2 预授权签名并存储
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import {
  PERMIT2_ADDRESS,
  getPermit2Allowance,
  getBackendWalletAddress,
  isPermit2Configured,
} from '@/services/permit2Service';

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

    // 获取用户钱包地址
    const userWalletAddress = agent.user?.walletAddress;
    if (!userWalletAddress) {
      return NextResponse.json({ error: 'User wallet address not found' }, { status: 400 });
    }

    // 存储预授权（使用 Permit2 格式）
    const paymentAuth = await prisma.agentPaymentAuth.create({
      data: {
        userId: userWalletAddress.toLowerCase(),
        agentId,
        signature: payload.signature,
        nonce: `permit2-${details.nonce}-${Date.now()}`, // Permit2 nonce 格式
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
        message: 'Permit2 预授权成功，有效期30天',
      },
    });
  } catch (error) {
    console.error('POST /api/agents/[id]/preauth/permit2 error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
