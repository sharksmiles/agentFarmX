import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CROPS = {
  Apple: { growTime: 60, baseReward: 50, energyCost: 10 },
  Wheat: { growTime: 30, baseReward: 20, energyCost: 5 },
  Corn: { growTime: 45, baseReward: 35, energyCost: 8 },
  Tomato: { growTime: 40, baseReward: 30, energyCost: 7 },
};

// POST /api/farm/harvest - Harvest a crop
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
      include: { landPlots: true, user: true },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Find the plot
    const plot = farmState.landPlots.find((p) => p.plotIndex === plotIndex);

    if (!plot) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    if (!plot.cropId || !plot.harvestAt) {
      return NextResponse.json(
        { error: 'No crop to harvest' },
        { status: 400 }
      );
    }

    // Check if crop is ready
    const now = new Date();
    if (now < plot.harvestAt) {
      return NextResponse.json(
        { error: 'Crop is not ready yet' },
        { status: 400 }
      );
    }

    // Calculate reward
    const crop = CROPS[plot.cropId as keyof typeof CROPS];
    const reward = Math.floor(crop.baseReward * plot.boostMultiplier);

    // Harvest the crop
    const [updatedPlot, updatedUser, updatedFarmState, inventory, transaction] =
      await prisma.$transaction([
        // Clear the plot
        prisma.landPlot.update({
          where: { id: plot.id },
          data: {
            cropId: null,
            plantedAt: null,
            harvestAt: null,
            growthStage: 0,
            boostMultiplier: 1.0,
            boostExpireAt: null,
          },
        }),
        // Add coins to user
        prisma.user.update({
          where: { id: userId },
          data: {
            farmCoins: farmState.user.farmCoins + reward,
            experience: farmState.user.experience + 10,
          },
        }),
        // Update farm stats
        prisma.farmState.update({
          where: { id: farmState.id },
          data: {
            totalHarvests: farmState.totalHarvests + 1,
          },
        }),
        // Add crop to inventory
        prisma.inventory.upsert({
          where: {
            userId_itemType_itemId: {
              userId,
              itemType: 'crop',
              itemId: plot.cropId,
            },
          },
          create: {
            userId,
            itemType: 'crop',
            itemId: plot.cropId,
            quantity: 1,
          },
          update: {
            quantity: { increment: 1 },
          },
        }),
        // Create transaction record
        prisma.transaction.create({
          data: {
            userId,
            type: 'earn',
            category: 'harvest',
            amount: reward,
            balance: farmState.user.farmCoins + reward,
            description: `Harvested ${plot.cropId}`,
          },
        }),
      ]);

    return NextResponse.json({
      plot: updatedPlot,
      user: updatedUser,
      farmState: updatedFarmState,
      reward,
      inventory,
      transaction,
    });
  } catch (error) {
    console.error('POST /api/farm/harvest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
