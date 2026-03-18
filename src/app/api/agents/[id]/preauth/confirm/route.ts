/**
 * Agent Pre-authorization Confirm API
 * 
 * POST - 确认预授权签名并存储
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

export const dynamic = 'force-dynamic';

type AgentParams = { id: string };

interface PreauthConfirmRequest {
  payment: {
    x402Version: number;
    scheme: string;
    network: string;
    payload: {
      signature: string;
      authorization: {
        from: string;
        to: string;
        value: string;
        validAfter: string;
        validBefore: string;
        nonce: string;
      };
    };
  };
}

/**
 * POST /api/agents/[id]/preauth/confirm - 确认预授权签名
 */
export const POST = withAuth<AgentParams>(async (
  request: NextRequest,
  context: { params: AgentParams; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const body: PreauthConfirmRequest = await request.json();

    // 验证Agent所有权
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { payment } = body;

    if (!payment?.payload?.authorization) {
      return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 });
    }

    const auth = payment.payload.authorization;

    // 验证签名格式
    if (!auth.from || !auth.to || !auth.value || !auth.validAfter || !auth.validBefore || !auth.nonce) {
      return NextResponse.json({ error: 'Missing authorization fields' }, { status: 400 });
    }

    // 检查nonce是否已使用
    const existingNonce = await prisma.agentPaymentAuth.findUnique({
      where: { nonce: auth.nonce },
    });

    if (existingNonce) {
      return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
    }

    // 检查有效期是否合理（不超过31天）
    const validAfterTimestamp = parseInt(auth.validAfter);
    const validBeforeTimestamp = parseInt(auth.validBefore);
    const maxValidity = 31 * 24 * 60 * 60; // 31天

    if (validBeforeTimestamp - validAfterTimestamp > maxValidity) {
      return NextResponse.json({ error: 'Validity period too long' }, { status: 400 });
    }

    // 存储预授权
    const paymentAuth = await prisma.agentPaymentAuth.create({
      data: {
        userId: auth.from.toLowerCase(),
        agentId,
        signature: payment.payload.signature,
        nonce: auth.nonce,
        authorizedValue: BigInt(auth.value),
        usedValue: BigInt(0),
        validAfter: new Date(validAfterTimestamp * 1000),
        validBefore: new Date(validBeforeTimestamp * 1000),
        chainId: parseInt(payment.network.replace(/\D/g, '')) || 196,
        asset: process.env.USDC_CONTRACT_ADDRESS || '0x74b7f16337b8972027f6196a17a631ac6de26d22',
        payTo: auth.to.toLowerCase(),
        isActive: true,
      },
    });

    // 记录日志
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message: `Pre-authorization created: ${auth.value} USDC, valid until ${new Date(validBeforeTimestamp * 1000).toISOString()}`,
        metadata: {
          authId: paymentAuth.id,
          authorizedValue: auth.value,
          validBefore: validBeforeTimestamp,
        },
      },
    });

    return NextResponse.json({
      success: true,
      auth: {
        id: paymentAuth.id,
        authorizedValue: paymentAuth.authorizedValue.toString(),
        validBefore: paymentAuth.validBefore.toISOString(),
        message: '预授权成功，有效期30天',
      },
    });
  } catch (error) {
    console.error('POST /api/agents/[id]/preauth/confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
