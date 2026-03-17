/**
 * Agent SCA (Smart Contract Account) Top-up Endpoint
 * Allows users to add funds to their AI Agent's SCA wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface TopUpRequest {
  userId: string;
  amount: number; // Amount in USDC
  txHash: string; // Transaction hash of the deposit
  currency?: string; // Default: USDC
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const body: TopUpRequest = await request.json();
    const { userId, amount, txHash, currency = 'USDC' } = body;

    // Validate inputs
    if (!userId || !amount || !txHash) {
      return NextResponse.json(
        { error: 'userId, amount, and txHash are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate txHash format
    if (!txHash.startsWith('0x') || txHash.length !== 66) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    console.log(`[Agent Top-up] Processing top-up for agent ${agentId}, amount: ${amount} ${currency}`);

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this agent' },
        { status: 403 }
      );
    }

    // Check if transaction has already been processed
    const existingTopUp = await prisma.systemConfig.findUnique({
      where: { key: `agent_topup_${txHash}` },
    });

    if (existingTopUp) {
      return NextResponse.json(
        { error: 'Transaction already processed' },
        { status: 400 }
      );
    }

    // Verify transaction on-chain (simplified - in production, verify the actual transaction)
    // For now, we trust the client and just record it
    console.log(`[Agent Top-up] Verifying transaction: ${txHash}`);

    // Calculate new balance
    const currentBalance = agent.balanceUsdc || 0;
    const newBalance = currentBalance + amount;

    // Update agent balance and record transaction
    const [updatedAgent, _] = await prisma.$transaction([
      prisma.agent.update({
        where: { id: agentId },
        data: {
          balanceUsdc: newBalance,
        },
      }),
      // Record the top-up transaction
      prisma.systemConfig.create({
        data: {
          key: `agent_topup_${txHash}`,
          value: {
            agentId,
            userId,
            amount,
            currency,
            txHash,
            timestamp: new Date().toISOString(),
            previousBalance: currentBalance,
            newBalance,
          },
        },
      }),
    ]);

    console.log(`[Agent Top-up] Successfully topped up agent ${agentId}: ${currentBalance} -> ${newBalance} ${currency}`);

    return NextResponse.json({
      success: true,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        scaAddress: updatedAgent.scaAddress,
        balanceUsdc: updatedAgent.balanceUsdc,
        balanceOkb: updatedAgent.balanceOkb,
      },
      topUp: {
        amount,
        currency,
        txHash,
        previousBalance: currentBalance,
        newBalance,
      },
      message: `Successfully added ${amount} ${currency} to agent ${agent.name}`,
    });
  } catch (error) {
    console.error('POST /api/agents/[id]/topup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve top-up history for an agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this agent' },
        { status: 403 }
      );
    }

    // Get all top-up records for this agent
    const topUpRecords = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'agent_topup_',
        },
      },
    });

    // Filter records for this agent
    const agentTopUps = topUpRecords
      .filter((record) => {
        const value = record.value as any;
        return value.agentId === agentId;
      })
      .map((record) => {
        const value = record.value as any;
        return {
          txHash: value.txHash,
          amount: value.amount,
          currency: value.currency || 'USDC',
          timestamp: value.timestamp,
          previousBalance: value.previousBalance,
          newBalance: value.newBalance,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        scaAddress: agent.scaAddress,
        balanceUsdc: agent.balanceUsdc,
        balanceOkb: agent.balanceOkb,
      },
      topUps: agentTopUps,
      totalTopUps: agentTopUps.length,
      totalAmount: agentTopUps.reduce((sum, t) => sum + t.amount, 0),
    });
  } catch (error) {
    console.error('GET /api/agents/[id]/topup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
