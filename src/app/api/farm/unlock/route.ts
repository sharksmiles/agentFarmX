import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LAND_UNLOCK_COSTS = {
  6: 500,   // 7th plot
  7: 1000,  // 8th plot
  8: 2000,  // 9th plot
  9: 5000,  // 10th plot
  10: 10000, // 11th plot
  11: 20000, // 12th plot
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex } = body;

    if (!userId || plotIndex === undefined) {
      return NextResponse.json(
        { error: 'userId and plotIndex are required' },
        { status: 400 }
      );
    }

    // Get farm state
    const farmState = await prisma.farmState.findUnique({
      where: { userId },
      include: {
        user: true,
        landPlots: true,
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Check if plot already exists
    const existingPlot = farmState.landPlots.find(
      (p) => p.plotIndex === plotIndex
    );

    if (existingPlot) {
      return NextResponse.json(
        { error: 'Plot already unlocked' },
        { status: 400 }
      );
    }

    // Get unlock cost
    const cost = LAND_UNLOCK_COSTS[plotIndex as keyof typeof LAND_UNLOCK_COSTS];
    if (!cost) {
      return NextResponse.json(
        { error: 'Invalid plot index' },
        { status: 400 }
      );
    }

    // Check if user has enough coins
    if (farmState.user.farmCoins < cost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    // Unlock plot
    const [newPlot, updatedUser, updatedFarmState] = await prisma.$transaction([
      prisma.landPlot.create({
        data: {
          farmStateId: farmState.id,
          plotIndex,
          isUnlocked: true,
          growthStage: 0,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: farmState.user.farmCoins - cost,
        },
      }),
      prisma.farmState.update({
        where: { id: farmState.id },
        data: {
          unlockedLands: farmState.unlockedLands + 1,
        },
      }),
    ]);

    return NextResponse.json({
      plot: newPlot,
      user: updatedUser,
      farmState: updatedFarmState,
    });
  } catch (error) {
    console.error('POST /api/farm/unlock error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
