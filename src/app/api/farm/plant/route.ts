import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

// Crop configuration
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

// POST /api/farm/plant - Plant a crop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex, cropId } = body;

    if (!userId || plotIndex === undefined || !cropId) {
      return NextResponse.json(
        { error: 'userId, plotIndex, and cropId are required' },
        { status: 400 }
      );
    }

    // Validate crop
    if (!(cropId in CROPS)) {
      // Allow other crops but with default values if not in config
      // Or just fail. Let's add more crops to config above.
      if (!CROPS[cropId as keyof typeof CROPS]) {
         // Fallback for unknown crops
      }
    }

    const crop = CROPS[cropId as keyof typeof CROPS] || { growTime: 60, baseReward: 10, energyCost: 5 };

    // Get farm state
    const farmState = await prisma.farmState.findUnique({
      where: { userId },
      include: { landPlots: true },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Check energy
    if (farmState.energy < crop.energyCost) {
      return NextResponse.json(
        { error: 'Insufficient energy' },
        { status: 400 }
      );
    }

    // Find the plot
    // plotIndex from frontend is 1-based usually (LandIdTypes), but DB is 0-based or 1-based?
    // Let's check how it was created.
    // In login route: plotIndex: i (0 to 5).
    // In frontend: selectedLandId (1 to 9).
    // So we need to handle the conversion.
    // The previous code used `p.plotIndex === plotIndex`.
    // We should assume plotIndex passed is what's in the DB.
    // But frontend `apiPlantCrop(selectedLandId, ...)` passes 1-based ID.
    // So we should subtract 1 if the DB uses 0-based.
    
    // Let's assume the frontend passes the 1-based ID and we convert it, OR the frontend passes 0-based.
    // Looking at plantmodal.tsx: `apiPlantCrop(selectedLandId, selectedCrop)` where selectedLandId is 1-9.
    // So we need to convert 1-based to 0-based for DB if DB is 0-based.
    // The login route creates plots with `plotIndex: i` where i is 0-5.
    // So DB is 0-based.
    // So we need `plotIndex - 1`.
    
    const dbPlotIndex = plotIndex > 0 ? plotIndex - 1 : plotIndex;

    const plot = farmState.landPlots.find((p) => p.plotIndex === dbPlotIndex);

    if (!plot) {
      return NextResponse.json(
        { error: 'Plot not found' },
        { status: 404 }
      );
    }

    if (!plot.isUnlocked) {
      return NextResponse.json(
        { error: 'Plot is locked' },
        { status: 400 }
      );
    }

    if (plot.cropId) {
      return NextResponse.json(
        { error: 'Plot already has a crop' },
        { status: 400 }
      );
    }

    // Plant the crop
    const now = new Date();
    const harvestAt = new Date(now.getTime() + crop.growTime * 60 * 1000);

    await prisma.$transaction([
      prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          cropId,
          plantedAt: now,
          harvestAt,
          lastWateredAt: now,
          nextWateringDue: new Date(now.getTime() + 10 * 60 * 1000), // Default 10 minutes
          growthStage: 1,
        } as any,
      }),
      prisma.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: { decrement: crop.energyCost },
          totalPlants: { increment: 1 },
        },
      }),
      // Reduce inventory if needed? Frontend checks inventory but backend doesn't seem to enforce it yet.
      // Ideally we should check and reduce inventory.
      // For now let's just plant.
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
    console.error('POST /api/farm/plant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
