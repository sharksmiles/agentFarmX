import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const plot = farmState.landPlots.find((p) => p.plotIndex === plotIndex);

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
    const [updatedPlot, updatedFarmState] = await prisma.$transaction([
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

    return NextResponse.json({
      plot: updatedPlot,
      farmState: updatedFarmState,
    });
  } catch (error) {
    console.error('POST /api/farm/water error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
