/**
 * Agent Authorization API
 * 
 * POST - Create/Update authorization for Agent SCA operations
 * GET - Get current authorization status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';
import { AgentSCAService } from '@/services/agentSCAService';
import { generateNonce } from '@/utils/blockchain/eip712Authorization';

// Type assertion for Prisma client with new models
const db = prisma as any;

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]/authorize
 * Get current authorization status for an Agent
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;

    // Verify agent belongs to user
    const agent = await db.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get authorization status
    const scaService = new AgentSCAService();
    const authorization = await scaService.getActiveAuthorization(agentId);

    // Get SCA balance
    let balance = null;
    if (agent.scaAddress) {
      balance = await scaService.getSCABalance(agent.scaAddress);
    }

    return NextResponse.json({
      agentId,
      scaAddress: agent.scaAddress,
      hasSCA: !!agent.scaAddress,
      balance,
      authorization: authorization ? {
        id: authorization.id,
        maxAmount: authorization.maxAmount,
        usedAmount: authorization.usedAmount,
        remainingAmount: authorization.remainingAmount,
        validAfter: authorization.validAfter,
        validBefore: authorization.validBefore,
        allowedTypes: authorization.allowedTypes,
        isActive: authorization.isActive,
      } : null,
    });
  } catch (error) {
    console.error('GET /api/agents/[id]/authorize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/agents/[id]/authorize
 * Create or update authorization for Agent SCA operations
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const body = await request.json();

    const {
      maxAmountUsdc,
      validDurationHours,
      allowedTypes,
      signature,
      nonce,
    } = body;

    // Validate input
    if (!maxAmountUsdc || maxAmountUsdc <= 0) {
      return NextResponse.json(
        { error: 'maxAmountUsdc must be greater than 0' },
        { status: 400 }
      );
    }

    if (!validDurationHours || validDurationHours <= 0) {
      return NextResponse.json(
        { error: 'validDurationHours must be greater than 0' },
        { status: 400 }
      );
    }

    if (!allowedTypes || !Array.isArray(allowedTypes) || allowedTypes.length === 0) {
      return NextResponse.json(
        { error: 'allowedTypes must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'signature is required' },
        { status: 400 }
      );
    }

    // Verify agent belongs to user
    const agent = await db.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has SCA
    if (!agent.scaAddress) {
      return NextResponse.json(
        { error: 'Agent does not have an SCA. Please create one first.' },
        { status: 400 }
      );
    }

    // Store authorization
    const scaService = new AgentSCAService();
    const result = await scaService.storeAuthorization({
      agentId,
      userId,
      maxAmountUsdc,
      validDurationHours,
      allowedTypes,
      signature,
      nonce: nonce || generateNonce(),
    });

    return NextResponse.json({
      success: true,
      authorizationId: result.authorizationId,
      message: 'Authorization created successfully',
    });
  } catch (error: any) {
    console.error('POST /api/agents/[id]/authorize error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/agents/[id]/authorize
 * Revoke authorization
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const agentId = context.params.id;
    const userId = context.auth.userId;
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('authorizationId');

    if (!authorizationId) {
      return NextResponse.json(
        { error: 'authorizationId is required' },
        { status: 400 }
      );
    }

    const scaService = new AgentSCAService();
    await scaService.revokeAuthorization(authorizationId, userId);

    return NextResponse.json({
      success: true,
      message: 'Authorization revoked',
    });
  } catch (error: any) {
    console.error('DELETE /api/agents/[id]/authorize error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
