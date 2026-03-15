import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

const CROPS = {
  Apple: { growTime: 60, baseReward: 50, energyCost: 10 },
  Wheat: { growTime: 30, baseReward: 20, energyCost: 5 },
  Corn: { growTime: 45, baseReward: 35, energyCost: 8 },
  Tomato: { growTime: 40, baseReward: 30, energyCost: 7 },
  Carrot: { growTime: 40, baseReward: 30, energyCost: 7 },
  Potato: { growTime: 40, baseReward: 30, energyCost: 7 },
  Strawberry: { growTime: 40, baseReward: 30, energyCost: 7 },
  Pineapple: { growTime: 40, baseReward: 30, energyCost: 7 },
  Watermelon: { growTime: 40, baseReward: 30, energyCost: 7 },
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
    // Handle 1-based vs 0-based index
    const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;
    const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);

    if (!plot) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    if (!plot.cropId) {
      return NextResponse.json(
        { error: 'No crop to harvest' },
        { status: 400 }
      );
    }

    // Calculate reward
    const cropConfig = CROPS[plot.cropId as keyof typeof CROPS] || { baseReward: 10 };
    const reward = Math.floor(cropConfig.baseReward * (plot.boostMultiplier || 1.0));

    // Harvest the crop
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
          update: {
            quantity: { increment: 1 },
          },
          create: {
            userId,
            itemType: 'crop',
            itemId: plot.cropId,
            quantity: 1,
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
    console.error('POST /api/farm/harvest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
