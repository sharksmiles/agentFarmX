import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BOOST_MULTIPLIER = 2.0;
const BOOST_DURATION = 30 * 60 * 1000; // 30 minutes

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
        { error: 'No crop to boost' },
        { status: 400 }
      );
    }

    // Check if user has boost item in inventory
    const boostItem = await prisma.inventory.findFirst({
      where: {
        userId,
        itemType: 'boost',
        quantity: { gt: 0 },
      },
    });

    if (!boostItem) {
      return NextResponse.json(
        { error: 'No boost item available' },
        { status: 400 }
      );
    }

    // Apply boost
    const [updatedPlot, updatedInventory] = await prisma.$transaction([
      prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: BOOST_MULTIPLIER,
          boostExpireAt: new Date(Date.now() + BOOST_DURATION),
        },
      }),
      prisma.inventory.update({
        where: { id: boostItem.id },
        data: {
          quantity: boostItem.quantity - 1,
        },
      }),
    ]);

    return NextResponse.json({
      plot: updatedPlot,
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error('POST /api/farm/boost error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
