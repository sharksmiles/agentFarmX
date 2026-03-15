import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

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

    // Daily boost reset logic
    let boostItem = user.inventory.find(i => i.itemType === 'boost');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!boostItem) {
      // Create initial boost if missing
      boostItem = await prisma.inventory.create({
        data: {
          userId: user.id,
          itemType: 'boost',
          itemId: 'daily_boost',
          quantity: 3,
        }
      });
      user.inventory.push(boostItem);
    } else {
      const lastUpdate = new Date(boostItem.updatedAt);
      const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());

      if (lastUpdateDay < today) {
        // Reset to 3 if it was last updated on a previous day
        const updatedBoost = await prisma.inventory.update({
          where: { id: boostItem.id },
          data: {
            quantity: 3,
          }
        });
        // Update the in-memory user object
        const index = user.inventory.findIndex(i => i.id === boostItem!.id);
        user.inventory[index] = updatedBoost;
      }
    }

    return NextResponse.json(mapUserToFrontend(user));
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
        username: username || `X Layer-${walletAddress.slice(-4)}`,
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
        inventory: {
          create: [
            {
              itemType: 'boost',
              itemId: 'daily_boost',
              quantity: 3,
            }
          ]
        }
      },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
        inventory: true,
      },
    });

    return NextResponse.json(mapUserToFrontend(user));
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
