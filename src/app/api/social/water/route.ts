import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const WATER_REWARD = 5; // Coins for watering friend's crop
const WATER_BOOST = 1.05; // 5% boost

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId, plotIndex } = body;

    if (!userId || !friendId || plotIndex === undefined) {
      return NextResponse.json(
        { error: 'userId, friendId, and plotIndex are required' },
        { status: 400 }
      );
    }

    // Get friend's farm
    const friendFarm = await prisma.farmState.findUnique({
      where: { userId: friendId },
      include: { landPlots: true },
    });

    if (!friendFarm) {
      return NextResponse.json(
        { error: 'Friend farm not found' },
        { status: 404 }
      );
    }

    const plot = friendFarm.landPlots.find((p) => p.plotIndex === plotIndex);

    if (!plot || !plot.cropId) {
      return NextResponse.json(
        { error: 'No crop to water' },
        { status: 400 }
      );
    }

    // Water the crop and give reward
    const [updatedPlot, socialAction, updatedUser] = await prisma.$transaction([
      prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST,
        },
      }),
      prisma.socialAction.create({
        data: {
          fromUserId: userId,
          toUserId: friendId,
          actionType: 'water',
          metadata: {
            plotIndex,
            reward: WATER_REWARD,
            cropId: plot.cropId,
          },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: WATER_REWARD },
        },
      }),
    ]);

    return NextResponse.json({
      plot: updatedPlot,
      reward: WATER_REWARD,
      user: updatedUser,
    });
  } catch (error) {
    console.error('POST /api/social/water error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
