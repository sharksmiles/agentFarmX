import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

const WATER_ENERGY_COST = 5;
const WATER_BOOST_MULTIPLIER = 1.1;

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
        landPlots: true,
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Check energy
    if (farmState.energy < WATER_ENERGY_COST) {
      return NextResponse.json(
        { error: 'Insufficient energy' },
        { status: 400 }
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
        { error: 'No crop to water' },
        { status: 400 }
      );
    }

    // Water the crop
    await prisma.$transaction([
      prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST_MULTIPLIER,
          boostExpireAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      }),
      prisma.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: farmState.energy - WATER_ENERGY_COST,
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
    console.error('POST /api/farm/water error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
