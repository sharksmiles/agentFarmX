import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

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

    // Handle 1-based vs 0-based index
    const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;

    // Check if plot already exists
    const existingPlot = farmState.landPlots.find(
      (p) => p.plotIndex === dbPlotIndex
    );

    if (existingPlot) {
        if (existingPlot.isUnlocked) {
            return NextResponse.json(
                { error: 'Plot already unlocked' },
                { status: 400 }
            );
        }
        // If plot exists but locked, we can proceed to unlock it
        // But usually plot existence means unlocked in the current model?
        // Wait, landPlots table has `isUnlocked`.
        // So existingPlot means it's in the DB.
        // We should check isUnlocked.
    }

    // Get unlock cost
    // Use dbPlotIndex for cost lookup
    const cost = LAND_UNLOCK_COSTS[dbPlotIndex as keyof typeof LAND_UNLOCK_COSTS];
    if (!cost) {
      return NextResponse.json(
        { error: 'Invalid plot index or not unlockable' },
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
    await prisma.$transaction([
      // Upsert plot just in case
      prisma.landPlot.upsert({
        where: {
            farmStateId_plotIndex: {
                farmStateId: farmState.id,
                plotIndex: dbPlotIndex
            }
        },
        create: {
          farmStateId: farmState.id,
          plotIndex: dbPlotIndex,
          isUnlocked: true,
          growthStage: 0,
        },
        update: {
            isUnlocked: true
        }
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

    // Fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            farmState: {
                include: {
                    landPlots: true
                }
            },
            inventory: true
        }
    });

    if (!updatedUser) {
        throw new Error('User not found after update');
    }

    return NextResponse.json(mapUserToFrontend(updatedUser));

  } catch (error) {
    console.error('POST /api/farm/unlock error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
