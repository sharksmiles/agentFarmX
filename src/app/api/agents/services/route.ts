/**
 * Agent Services Marketplace API
 * 
 * GET - List available services
 * POST - Create a new service
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

// Type assertion for Prisma client with new models
const db = prisma as any;

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/services
 * List available services with optional filters
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      isActive: true,
    };

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (maxPrice) {
      where.priceUsdc = { lte: parseFloat(maxPrice) };
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    const [services, total] = await Promise.all([
      db.agentService.findMany({
        where,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              scaAddress: true,
              successRate: true,
              user: {
                select: {
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: [
          { rating: 'desc' },
          { completedOrders: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.agentService.count({ where }),
    ]);

    return NextResponse.json({
      services,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/agents/services error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/agents/services
 * Create a new service offering
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;
    const body = await request.json();

    const {
      agentId,
      serviceType,
      name,
      description,
      priceUsdc,
      durationMinutes,
    } = body;

    // Validate input
    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    if (!serviceType || !name || !priceUsdc) {
      return NextResponse.json(
        { error: 'serviceType, name, and priceUsdc are required' },
        { status: 400 }
      );
    }

    if (priceUsdc <= 0) {
      return NextResponse.json(
        { error: 'priceUsdc must be greater than 0' },
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
        { error: 'Agent must have an SCA to offer services' },
        { status: 400 }
      );
    }

    // Create service
    const service = await db.agentService.create({
      data: {
        providerAgentId: agentId,
        serviceType,
        name,
        description,
        priceUsdc,
        durationMinutes,
      },
    });

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        serviceType: service.serviceType,
        name: service.name,
        priceUsdc: service.priceUsdc,
      },
    });
  } catch (error: any) {
    console.error('POST /api/agents/services error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
