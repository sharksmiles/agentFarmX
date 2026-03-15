import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

const UPGRADE_COSTS = {
  1: 1000,   // Level 2
  2: 2500,   // Level 3
  3: 5000,   // Level 4
  4: 10000,  // Level 5
  5: 20000,  // Level 6
};

const MAX_ENERGY_PER_LEVEL = {
  1: 100,
  2: 120,
  3: 150,
  4: 200,
  5: 250,
  6: 300,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user and farm state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: true,
      },
    });

    if (!user || !user.farmState) {
      return NextResponse.json(
        { error: 'User or farm state not found' },
        { status: 404 }
      );
    }

    const currentLevel = user.level;
    const nextLevel = currentLevel + 1;

    // Check if max level reached
    if (nextLevel > 6) {
      return NextResponse.json(
        { error: 'Max level reached' },
        { status: 400 }
      );
    }

    // Get upgrade cost
    const cost = UPGRADE_COSTS[currentLevel as keyof typeof UPGRADE_COSTS];

    // Check if user has enough coins
    if (user.farmCoins < cost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    // Upgrade farm
    const newMaxEnergy = MAX_ENERGY_PER_LEVEL[nextLevel as keyof typeof MAX_ENERGY_PER_LEVEL];

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          level: nextLevel,
          farmCoins: user.farmCoins - cost,
        },
      }),
      prisma.farmState.update({
        where: { id: user.farmState.id },
        data: {
          maxEnergy: newMaxEnergy,
          energy: newMaxEnergy, // Refill energy on upgrade
        },
      }),
    ]);

    // Fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
        inventory: true,
      },
    });

    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return NextResponse.json(mapUserToFrontend(updatedUser));
  } catch (error) {
    console.error('POST /api/farm/upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
