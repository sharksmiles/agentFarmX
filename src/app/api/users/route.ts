import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/users - Get user by wallet address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
        inventory: true,
        agents: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username, avatar } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create user with farm state and initial land plots
    const user = await prisma.user.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        username,
        avatar,
        farmState: {
          create: {
            energy: 100,
            maxEnergy: 100,
            unlockedLands: 6,
            landPlots: {
              create: Array.from({ length: 6 }, (_, i) => ({
                plotIndex: i,
                isUnlocked: true,
                growthStage: 0,
              })),
            },
          },
        },
      },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
